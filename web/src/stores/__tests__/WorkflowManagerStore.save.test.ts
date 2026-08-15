import { QueryClient } from "@tanstack/react-query";
import { createWorkflowManagerStore } from "../WorkflowManagerStore";
import { trpcClient } from "../../trpc/client";
import type { Workflow } from "../ApiTypes";

jest.mock("../../trpc/client", () => ({
  trpcClient: {
    workflows: {
      update: { mutate: jest.fn() },
      versions: { create: { mutate: jest.fn() } }
    }
  }
}));

const updateMutate = trpcClient.workflows.update
  .mutate as jest.Mock;
const versionMutate = trpcClient.workflows.versions.create
  .mutate as jest.Mock;

const makeStore = () => createWorkflowManagerStore(new QueryClient());

describe("WorkflowManagerStore persistence preconditions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    versionMutate.mockResolvedValue({});
  });

  it("newWorkflow does not fabricate updated_at (no server revision exists)", () => {
    const store = makeStore();
    const workflow = store.getState().newWorkflow();
    expect(workflow.updated_at).toBeUndefined();
  });

  it("copy does not fabricate updated_at for the unsaved copy", async () => {
    const store = makeStore();
    const original = {
      ...store.getState().newWorkflow(),
      id: "wf-original",
      updated_at: "2026-01-01T00:00:00.000Z"
    };
    store.getState().addWorkflow(original);
    const copied = await store.getState().copy(original);
    expect(copied.updated_at).toBeUndefined();
  });

  it("first save of a new workflow omits expected_updated_at so the server upserts", async () => {
    const store = makeStore();
    const workflow = store.getState().newWorkflow();
    updateMutate.mockResolvedValue({
      ...workflow,
      updated_at: "2026-08-15T00:00:00.000Z"
    });

    await store.getState().saveWorkflow(workflow);

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const payload = updateMutate.mock.calls[0][0];
    expect(payload.id).toBe(workflow.id);
    expect(payload.expected_updated_at).toBeUndefined();
  });

  it("saving a previously persisted workflow sends expected_updated_at", async () => {
    const store = makeStore();
    const workflow = {
      ...store.getState().newWorkflow(),
      updated_at: "2026-08-15T00:00:00.000Z"
    } as Workflow;
    updateMutate.mockResolvedValue(workflow);

    await store.getState().saveWorkflow(workflow);

    const payload = updateMutate.mock.calls[0][0];
    expect(payload.expected_updated_at).toBe("2026-08-15T00:00:00.000Z");
  });
});
