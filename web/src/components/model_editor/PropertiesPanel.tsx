/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { memo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import * as THREE from "three";
import {
  FlexColumn,
  FlexRow,
  Text,
  Divider,
  TextInput,
  ScrollArea,
  Checkbox,
  SelectField,
  TabGroup,
  TabPanel,
  type TabItem,
  NodeSlider,
  SPACING,
  getSpacingPx
} from "../ui_primitives";
import ColorPicker from "../inputs/ColorPicker";
import {
  GEOMETRY_PARAM_SPECS,
  buildGeometry,
  isEditableGeometryType,
  readGeometryParams
} from "./geometryParams";

const styles = (theme: Theme) =>
  css({
    "&": { width: "100%", height: "100%", minHeight: 0 },
    ".section-title": {
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: theme.vars.palette.text.secondary,
      margin: `${getSpacingPx(SPACING.lg)} ${getSpacingPx(SPACING.md)} ${getSpacingPx(SPACING.xs)}`
    },
    ".field-row": {
      padding: `${getSpacingPx(SPACING.micro)} ${getSpacingPx(SPACING.md)}`,
      gap: getSpacingPx(SPACING.sm),
      alignItems: "center"
    },
    ".field-label": {
      width: "72px",
      flexShrink: 0,
      color: theme.vars.palette.text.secondary
    },
    ".num-field .MuiInputBase-input": {
      padding: `${getSpacingPx(SPACING.xs)} ${getSpacingPx(SPACING.sm)}`,
      fontSize: theme.fontSizeSmall
    },
    ".num-cell": { flex: 1, minWidth: 0 },
    ".slider": { flex: 1, margin: `0 ${getSpacingPx(SPACING.md)}`, minWidth: 0 },
    ".slider-value": {
      width: "52px",
      flexShrink: 0,
      ".num-field": { width: "52px" }
    },
    ".color-row": {
      padding: `${getSpacingPx(SPACING.xs)} ${getSpacingPx(SPACING.md)}`,
      gap: getSpacingPx(SPACING.md),
      alignItems: "center"
    },
    ".select-field": {
      flex: 1,
      ".MuiSelect-select": {
        padding: `${getSpacingPx(SPACING.xs)} ${getSpacingPx(SPACING.sm)}`,
        fontSize: theme.fontSizeSmall
      },
      ".MuiSvgIcon-root": { fontSize: "var(--fontSizeNormal)" }
    },
    ".empty": { padding: `${getSpacingPx(SPACING.xl)} ${getSpacingPx(SPACING.md)}` }
  });

const roundTo = (value: number, digits = 4): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

interface NumberFieldProps {
  value: number;
  onCommit: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
}

const NumberField = ({
  value,
  onCommit,
  step = 0.1,
  min,
  max,
  integer = false
}: NumberFieldProps) => {
  const [text, setText] = useState(String(roundTo(value)));
  // Resync the text buffer when the external value changes (e.g. gizmo drag),
  // without clobbering in-progress typing. Adjusting state during render is the
  // React-recommended pattern for deriving state from a changing prop.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = parseFloat(text);
    if (!Number.isFinite(parsed) || Math.abs(parsed - value) > 1e-6) {
      setText(String(roundTo(value)));
    }
  }

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setText(next);
      const parsed = parseFloat(next);
      if (Number.isFinite(parsed)) {
        // Commit raw while typing; clamp/round on blur so multi-digit entry
        // (e.g. typing "12" into a min-3 field) isn't fought by the clamp.
        onCommit(integer ? Math.round(parsed) : parsed);
      }
    },
    [onCommit, integer]
  );

  const handleBlur = useCallback(() => {
    let parsed = parseFloat(text);
    if (!Number.isFinite(parsed)) {
      setText(String(roundTo(value)));
      return;
    }
    if (integer) {
      parsed = Math.round(parsed);
    }
    if (min !== undefined) {
      parsed = Math.max(min, parsed);
    }
    if (max !== undefined) {
      parsed = Math.min(max, parsed);
    }
    setText(String(integer ? parsed : roundTo(parsed)));
    onCommit(parsed);
  }, [text, value, integer, min, max, onCommit]);

  return (
    <TextInput
      className="num-field nodrag nowheel"
      type="number"
      size="small"
      inputProps={{ step }}
      value={text}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

interface NumberRowProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
}

// Bounded params (both min and max defined) render as a slider with a compact
// numeric readout; unbounded ones (dimensions, segments, intensity) stay as a
// plain number field.
const NumberRow = memo(({ label, value, onCommit, step, min, max, integer }: NumberRowProps) => {
  const isSlider = min !== undefined && max !== undefined;
  return (
    <FlexRow className="field-row" fullWidth>
      <Text size="small" className="field-label">
        {label}
      </Text>
      {isSlider && (
        <NodeSlider
          className="slider"
          value={value}
          min={min}
          max={max}
          step={integer ? 1 : step ?? 0.01}
          onChange={(_e, v) => onCommit(Array.isArray(v) ? v[0] : v)}
        />
      )}
      <div className={isSlider ? "slider-value" : "num-cell"}>
        <NumberField
          value={value}
          onCommit={onCommit}
          step={step}
          min={min}
          max={max}
          integer={integer}
        />
      </div>
    </FlexRow>
  );
});

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CheckboxRow = ({ label, checked, onChange }: CheckboxRowProps) => (
  <FlexRow className="field-row" fullWidth>
    <Text size="small" className="field-label">
      {label}
    </Text>
    <Checkbox checked={checked} onChange={(_e, c) => onChange(c)} />
  </FlexRow>
);

interface ColorRowProps {
  label: string;
  color: THREE.Color;
  onChange: () => void;
}

const ColorRow = ({ label, color, onChange }: ColorRowProps) => (
  <FlexRow className="color-row" fullWidth>
    <Text size="small" className="field-label">
      {label}
    </Text>
    <ColorPicker
      showCustom
      color={`#${color.getHexString()}`}
      onColorChange={(c) => {
        if (c) {
          color.set(c);
          onChange();
        }
      }}
    />
  </FlexRow>
);

interface Vector3RowProps {
  label: string;
  vector: THREE.Vector3 | THREE.Euler;
  toDisplay?: (v: number) => number;
  fromDisplay?: (v: number) => number;
  step?: number;
  onChanged: () => void;
}

const Vector3Row = ({
  label,
  vector,
  toDisplay = (v) => v,
  fromDisplay = (v) => v,
  step,
  onChanged
}: Vector3RowProps) => {
  const commit = (axis: "x" | "y" | "z") => (value: number) => {
    vector[axis] = fromDisplay(value);
    onChanged();
  };
  return (
    <FlexRow className="field-row" fullWidth>
      <Text size="small" className="field-label">
        {label}
      </Text>
      <NumberField value={toDisplay(vector.x)} onCommit={commit("x")} step={step} />
      <NumberField value={toDisplay(vector.y)} onCommit={commit("y")} step={step} />
      <NumberField value={toDisplay(vector.z)} onCommit={commit("z")} step={step} />
    </FlexRow>
  );
};

// --- Typed-but-dynamic property access -------------------------------------
// Material fields differ by material type (Standard vs Physical vs loaded GLTF
// materials). These helpers read/write a property only when it is actually
// present with the expected runtime type, so the panel adapts to whatever
// material the selected mesh carries without `any`.
const getNumberProp = (obj: Record<string, unknown>, key: string): number | undefined => {
  const v = obj[key];
  return typeof v === "number" ? v : undefined;
};

const setNumberProp = (obj: Record<string, unknown>, key: string, value: number): void => {
  obj[key] = value;
};

const getColorProp = (obj: Record<string, unknown>, key: string): THREE.Color | undefined => {
  const v = obj[key];
  return v instanceof THREE.Color ? v : undefined;
};

const getBoolProp = (obj: Record<string, unknown>, key: string): boolean | undefined => {
  const v = obj[key];
  return typeof v === "boolean" ? v : undefined;
};

const setBoolProp = (obj: Record<string, unknown>, key: string, value: boolean): void => {
  obj[key] = value;
};

interface MaterialNumberSpec {
  key: string;
  label: string;
  min?: number;
  max?: number;
  step: number;
}

// Ordered so common PBR controls come first; physical-only fields are skipped
// automatically when absent on the material.
const MATERIAL_NUMBER_FIELDS: readonly (MaterialNumberSpec & {
  labelKey: string;
})[] = [
  { key: "metalness", labelKey: "material.metalness", label: "Metalness", min: 0, max: 1, step: 0.05 },
  { key: "roughness", labelKey: "material.roughness", label: "Roughness", min: 0, max: 1, step: 0.05 },
  { key: "emissiveIntensity", labelKey: "material.emissive", label: "Emissive", min: 0, step: 0.05 },
  { key: "ior", labelKey: "material.ior", label: "IOR", min: 1, max: 2.333, step: 0.01 },
  { key: "reflectivity", labelKey: "material.reflectivity", label: "Reflectivity", min: 0, max: 1, step: 0.05 },
  { key: "specularIntensity", labelKey: "material.specular", label: "Specular", min: 0, max: 1, step: 0.05 },
  { key: "clearcoat", labelKey: "material.clearcoat", label: "Clearcoat", min: 0, max: 1, step: 0.05 },
  { key: "clearcoatRoughness", labelKey: "material.ccRough", label: "CC Rough", min: 0, max: 1, step: 0.05 },
  { key: "sheen", labelKey: "material.sheen", label: "Sheen", min: 0, max: 1, step: 0.05 },
  { key: "sheenRoughness", labelKey: "material.sheenRough", label: "Sheen Rough", min: 0, max: 1, step: 0.05 },
  { key: "transmission", labelKey: "material.transmission", label: "Transmission", min: 0, max: 1, step: 0.05 },
  { key: "thickness", labelKey: "material.thickness", label: "Thickness", min: 0, step: 0.1 },
  { key: "iridescence", labelKey: "material.iridescence", label: "Iridescence", min: 0, max: 1, step: 0.05 },
  { key: "iridescenceIOR", labelKey: "material.iridIor", label: "Irid IOR", min: 1, max: 2.333, step: 0.01 },
  { key: "dispersion", labelKey: "material.dispersion", label: "Dispersion", min: 0, step: 0.1 }
];

const MATERIAL_COLOR_FIELDS: readonly { key: string; labelKey: string; label: string }[] = [
  { key: "color", labelKey: "material.color", label: "Color" },
  { key: "emissive", labelKey: "material.emissiveColor", label: "Emissive" },
  { key: "sheenColor", labelKey: "material.sheenColor", label: "Sheen Col" },
  { key: "specularColor", labelKey: "material.specularColor", label: "Specular" },
  { key: "attenuationColor", labelKey: "material.attenuationColor", label: "Atten Col" }
];

// `recompile` fields change the shader program and require needsUpdate = true.
const MATERIAL_FLAG_FIELDS: readonly {
  key: string;
  labelKey: string;
  label: string;
  recompile: boolean;
}[] = [
  { key: "transparent", labelKey: "material.transparent", label: "Transparent", recompile: true },
  { key: "wireframe", labelKey: "material.wireframe", label: "Wireframe", recompile: false },
  { key: "flatShading", labelKey: "material.flatShading", label: "Flat Shading", recompile: true },
  { key: "vertexColors", labelKey: "material.vertexColors", label: "Vertex Cols", recompile: true },
  { key: "depthTest", labelKey: "material.depthTest", label: "Depth Test", recompile: false },
  { key: "depthWrite", labelKey: "material.depthWrite", label: "Depth Write", recompile: false }
];

const SIDE_OPTION_DEFS = [
  { value: String(THREE.FrontSide), labelKey: "side.front" },
  { value: String(THREE.BackSide), labelKey: "side.back" },
  { value: String(THREE.DoubleSide), labelKey: "side.double" }
] as const;

interface PropertiesPanelProps {
  object: THREE.Object3D | null;
  /** Bump to force re-read of mutated object values (e.g. after gizmo drag). */
  tick: number;
  onChanged: () => void;
}

const PropertiesPanel = ({ object, tick, onChanged }: PropertiesPanelProps) => {
  const { t } = useTranslation("model3d");
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("object");
  // `tick` is intentionally a render trigger: bumping it re-renders this panel
  // so NumberField inputs resync from objects mutated by gizmo drags.
  void tick;

  const sideOptions = SIDE_OPTION_DEFS.map((o) => ({
    value: o.value,
    label: t(o.labelKey as `side.${string}`)
  }));

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (object) {
        object.name = e.target.value;
        onChanged();
      }
    },
    [object, onChanged]
  );

  if (!object) {
    return (
      <FlexColumn css={styles(theme)} className="properties-panel" fullHeight>
        <Text size="small" color="secondary" className="empty">
          {t("empty.selectObject")}
        </Text>
      </FlexColumn>
    );
  }

  const mesh = object instanceof THREE.Mesh ? object : null;
  const material =
    mesh && !Array.isArray(mesh.material) ? mesh.material : null;
  const light = object instanceof THREE.Light ? object : null;
  const pointLight =
    object instanceof THREE.PointLight ? object : null;

  const geometryType = mesh?.geometry.type;
  const geometryParams = mesh ? readGeometryParams(mesh.geometry) : null;

  const rebuildGeometry = (key: string, isAngle: boolean) => (display: number) => {
    if (!mesh || !isEditableGeometryType(geometryType)) {
      return;
    }
    const raw = isAngle ? THREE.MathUtils.degToRad(display) : display;
    const next = { ...readGeometryParams(mesh.geometry), [key]: raw };
    const rebuilt = buildGeometry(geometryType, next);
    mesh.geometry.dispose();
    mesh.geometry = rebuilt;
    onChanged();
  };

  const hasGeometry =
    !!mesh && !!geometryParams && isEditableGeometryType(geometryType);
  const tabs: TabItem[] = [{ value: "object", label: t("tab.object") }];
  if (hasGeometry) {
    tabs.push({ value: "geometry", label: t("tab.geometry") });
  }
  if (material) {
    tabs.push({ value: "material", label: t("tab.material") });
  }
  // Fall back to the Object tab when the active one isn't available for the
  // newly selected object (e.g. a light has no geometry/material tab).
  const effectiveTab = tabs.some((t) => t.value === activeTab)
    ? activeTab
    : "object";

  return (
    <FlexColumn css={styles(theme)} className="properties-panel" fullHeight>
      <TabGroup
        className="properties-tabs"
        size="small"
        fullWidth
        tabs={tabs}
        value={effectiveTab}
        onChange={setActiveTab}
      />
      <ScrollArea>
        {/* Remount fields only when the selected object changes; live value
            updates from gizmo drags are handled by NumberField's value sync. */}
        <FlexColumn key={object.uuid} fullWidth>
          <TabPanel value="object" activeValue={effectiveTab}>
          <FlexRow className="field-row" fullWidth>
            <Text size="small" className="field-label">
              {t("label.name")}
            </Text>
            <TextInput
              className="num-field nodrag"
              size="small"
              value={object.name}
              onChange={handleNameChange}
            />
          </FlexRow>
          <Text size="smaller" color="secondary" sx={{ padding: `0 ${getSpacingPx(SPACING.md)}` }}>{object.type}</Text>
          <CheckboxRow
            label={t("label.visible")}
            checked={object.visible}
            onChange={(c) => {
              object.visible = c;
              onChanged();
            }}
          />
          <CheckboxRow
            label={t("label.frustumCull")}
            checked={object.frustumCulled}
            onChange={(c) => {
              object.frustumCulled = c;
              onChanged();
            }}
          />
          <NumberRow
            label={t("label.renderOrd")}
            value={object.renderOrder}
            integer
            step={1}
            onCommit={(v) => {
              object.renderOrder = v;
              onChanged();
            }}
          />
          {mesh && (
            <>
              <CheckboxRow
                label={t("label.castShadow")}
                checked={mesh.castShadow}
                onChange={(c) => {
                  mesh.castShadow = c;
                  onChanged();
                }}
              />
              <CheckboxRow
                label={t("label.recvShadow")}
                checked={mesh.receiveShadow}
                onChange={(c) => {
                  mesh.receiveShadow = c;
                  onChanged();
                }}
              />
            </>
          )}

          <Divider />
          <Text size="small" weight={600} className="section-title">
            {t("title.transform")}
          </Text>
          <Vector3Row label={t("label.position")} vector={object.position} step={0.1} onChanged={onChanged} />
          <Vector3Row
            label={t("label.rotation")}
            vector={object.rotation}
            toDisplay={THREE.MathUtils.radToDeg}
            fromDisplay={THREE.MathUtils.degToRad}
            step={1}
            onChanged={onChanged}
          />
          <Vector3Row label={t("label.scale")} vector={object.scale} step={0.1} onChanged={onChanged} />

          {light && (
            <>
              <Divider />
              <Text size="small" weight={600} className="section-title">
                {t("title.light")}
              </Text>
              <ColorRow label={t("label.color")} color={light.color} onChange={onChanged} />
              <NumberRow
                label={t("label.intensity")}
                value={light.intensity}
                min={0}
                step={0.1}
                onCommit={(v) => {
                  light.intensity = Math.max(0, v);
                  onChanged();
                }}
              />
              {pointLight && (
                <>
                  <NumberRow
                    label={t("label.distance")}
                    value={pointLight.distance}
                    min={0}
                    step={0.5}
                    onCommit={(v) => {
                      pointLight.distance = Math.max(0, v);
                      onChanged();
                    }}
                  />
                  <NumberRow
                    label={t("label.decay")}
                    value={pointLight.decay}
                    min={0}
                    step={0.1}
                    onCommit={(v) => {
                      pointLight.decay = Math.max(0, v);
                      onChanged();
                    }}
                  />
                </>
              )}
            </>
          )}
          </TabPanel>

          <TabPanel value="geometry" activeValue={effectiveTab}>
          {mesh && geometryParams && isEditableGeometryType(geometryType) && (
            <>
              <Text size="smaller" color="secondary" sx={{ padding: `0 ${getSpacingPx(SPACING.md)} ${getSpacingPx(SPACING.xs)}` }}>{geometryType}</Text>
              {GEOMETRY_PARAM_SPECS[geometryType].map((spec) => {
                const isAngle = spec.kind === "angle";
                const stored = geometryParams[spec.key];
                const value = typeof stored === "number" ? stored : 0;
                const display = isAngle ? THREE.MathUtils.radToDeg(value) : value;
                return (
                  <NumberRow
                    key={spec.key}
                    label={t(`geometry.${spec.key}` as `geometry.${string}`)}
                    value={display}
                    integer={spec.kind === "int"}
                    min={isAngle ? 0 : spec.min}
                    max={isAngle ? 360 : undefined}
                    step={isAngle ? 1 : spec.step}
                    onCommit={rebuildGeometry(spec.key, isAngle)}
                  />
                );
              })}
            </>
          )}
          </TabPanel>

          <TabPanel value="material" activeValue={effectiveTab}>
          {material && (
            <>
              <Text size="smaller" color="secondary" sx={{ padding: `0 ${getSpacingPx(SPACING.md)} ${getSpacingPx(SPACING.xs)}` }}>{material.type}</Text>

              {MATERIAL_COLOR_FIELDS.map(({ key, labelKey }) => {
                const color = getColorProp(material, key);
                return color ? (
                  <ColorRow
                    key={key}
                    label={t(labelKey as `material.${string}`)}
                    color={color}
                    onChange={onChanged}
                  />
                ) : null;
              })}

              {MATERIAL_NUMBER_FIELDS.map((spec) => {
                const current = getNumberProp(material, spec.key);
                return current === undefined ? null : (
                  <NumberRow
                    key={spec.key}
                    label={t(spec.labelKey as `material.${string}`)}
                    value={current}
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    onCommit={(v) => {
                      let next = v;
                      if (spec.min !== undefined) next = Math.max(spec.min, next);
                      if (spec.max !== undefined) next = Math.min(spec.max, next);
                      setNumberProp(material, spec.key, next);
                      onChanged();
                    }}
                  />
                );
              })}

              <NumberRow
                label={t("label.opacity")}
                value={material.opacity}
                min={0}
                max={1}
                step={0.05}
                onCommit={(v) => {
                  const clamped = THREE.MathUtils.clamp(v, 0, 1);
                  material.opacity = clamped;
                  if (clamped < 1) {
                    material.transparent = true;
                  }
                  material.needsUpdate = true;
                  onChanged();
                }}
              />
              <NumberRow
                label={t("label.alphaTest")}
                value={material.alphaTest}
                min={0}
                max={1}
                step={0.05}
                onCommit={(v) => {
                  material.alphaTest = THREE.MathUtils.clamp(v, 0, 1);
                  material.needsUpdate = true;
                  onChanged();
                }}
              />

              <FlexRow className="field-row" fullWidth>
                <Text size="small" className="field-label">
                  {t("label.side")}
                </Text>
                <SelectField
                  className="select-field nodrag"
                  hideLabel
                  label={t("label.side")}
                  size="small"
                  value={String(material.side)}
                  options={sideOptions}
                  onChange={(v) => {
                    material.side = Number(v) as THREE.Side;
                    material.needsUpdate = true;
                    onChanged();
                  }}
                />
              </FlexRow>

              {MATERIAL_FLAG_FIELDS.map(({ key, labelKey, recompile }) => {
                const checked = getBoolProp(material, key);
                return checked === undefined ? null : (
                  <CheckboxRow
                    key={key}
                    label={t(labelKey as `material.${string}`)}
                    checked={checked}
                    onChange={(c) => {
                      setBoolProp(material, key, c);
                      if (recompile) {
                        material.needsUpdate = true;
                      }
                      onChanged();
                    }}
                  />
                );
              })}
            </>
          )}
          </TabPanel>
        </FlexColumn>
      </ScrollArea>
    </FlexColumn>
  );
};

export default memo(PropertiesPanel);
