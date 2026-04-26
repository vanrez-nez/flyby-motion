import './demoSidebar.css';

export interface SidebarModeOption<T extends string> {
  value: T;
  label: string;
}

export interface SidebarControl {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  format?: (value: number) => string;
}

export interface SidebarMetric {
  label: string;
  value: string;
}

export interface SidebarAction {
  label: string;
  onClick: () => void;
}

interface DemoSidebarProps<T extends string> {
  title: string;
  subtitle?: string;
  modes?: SidebarModeOption<T>[];
  activeMode?: T;
  onModeChange?: (mode: T) => void;
  controls?: SidebarControl[];
  onControlChange?: (id: string, value: number) => void;
  metrics?: SidebarMetric[];
  actions?: SidebarAction[];
  hint?: string;
}

export function DemoSidebar<T extends string>({
  title,
  subtitle,
  modes = [],
  activeMode,
  onModeChange,
  controls = [],
  onControlChange,
  metrics = [],
  actions = [],
  hint,
}: DemoSidebarProps<T>) {
  return (
    <aside className="demo-sidebar">
      <header className="demo-sidebar__header">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </header>

      {modes.length > 0 ? (
        <div className="demo-sidebar__segmented" role="tablist" aria-label="Demo mode">
          {modes.map((mode) => (
            <button
              key={mode.value}
              className={mode.value === activeMode ? 'is-active' : ''}
              type="button"
              onClick={() => onModeChange?.(mode.value)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      ) : null}

      {controls.length > 0 ? (
        <div className="demo-sidebar__controls">
          {controls.map((control) => (
            <label
              key={control.id}
              className={`demo-sidebar__control${control.disabled ? ' is-disabled' : ''}`}
            >
              <span>
                <span>{control.label}</span>
                <strong>{control.format ? control.format(control.value) : formatNumber(control.value)}</strong>
              </span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step={control.step}
                value={control.value}
                disabled={control.disabled}
                onChange={(event) => onControlChange?.(control.id, Number(event.currentTarget.value))}
              />
            </label>
          ))}
        </div>
      ) : null}

      {metrics.length > 0 ? (
        <dl className="demo-sidebar__metrics">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {actions.length > 0 ? (
        <div className="demo-sidebar__actions">
          {actions.map((action) => (
            <button key={action.label} type="button" onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {hint ? <p className="demo-sidebar__hint">{hint}</p> : null}
    </aside>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
