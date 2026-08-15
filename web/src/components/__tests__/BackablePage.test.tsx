import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import mockTheme from "../../__mocks__/themeMock";
import BackablePage from "../BackablePage";

const PathProbe = () => {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
};

const renderAt = (entries: string[], initialIndex?: number) =>
  render(
    <ThemeProvider theme={mockTheme}>
      <MemoryRouter initialEntries={entries} initialIndex={initialIndex}>
      <Routes>
        <Route
          path="/settings"
          element={
            <BackablePage title="Settings">
              <div>settings body</div>
            </BackablePage>
          }
        />
        <Route path="/studio" element={<PathProbe />} />
        <Route path="/somewhere" element={<PathProbe />} />
      </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe("BackablePage", () => {
  it("renders the back button, title and children", () => {
    renderAt(["/settings"]);
    expect(
      screen.getByRole("button", { name: /back|返回/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("settings body")).toBeInTheDocument();
  });

  it("falls back to /studio on a cold first load", async () => {
    const user = userEvent.setup();
    renderAt(["/settings"]);
    await user.click(screen.getByRole("button", { name: /back|返回/i }));
    expect(screen.getByTestId("path")).toHaveTextContent("/studio");
  });

  it("goes back one history entry when the app navigated in-session", async () => {
    const user = userEvent.setup();
    renderAt(["/somewhere", "/settings"], 1);
    await user.click(screen.getByRole("button", { name: /back|返回/i }));
    expect(screen.getByTestId("path")).toHaveTextContent("/somewhere");
  });

  it("goes back on Cmd/Ctrl+[", () => {
    renderAt(["/settings"]);
    fireEvent.keyDown(window, { key: "[", metaKey: true });
    expect(screen.getByTestId("path")).toHaveTextContent("/studio");
  });

  it("ignores the shortcut while typing in an input", () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <MemoryRouter initialEntries={["/settings"]}>
          <Routes>
            <Route
              path="/settings"
              element={
                <BackablePage title="Settings">
                  <input aria-label="note" />
                </BackablePage>
              }
            />
            <Route path="/studio" element={<PathProbe />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );
    screen.getByLabelText("note").focus();
    fireEvent.keyDown(screen.getByLabelText("note"), {
      key: "[",
      metaKey: true
    });
    expect(screen.getByLabelText("note")).toBeInTheDocument();
    expect(screen.queryByTestId("path")).not.toBeInTheDocument();
  });
});
