window.__ModuleLoader__.load({
  id: "@local/dsh-weather-plugin",
  factory: (require) => {
    const module = { exports: {} };
    const React = require("react");
    const inject = ["slots", "settingsScope", "connection", "remote"];
    const h = React.createElement;
    function WeatherSettings({ scope }) {
      const snapshot = React.useSyncExternalStore((fn) => scope.subscribe(fn), () => scope.getSnapshot());
      const value = snapshot.value;
      if (snapshot.status !== "ready" || value === undefined) return h("div", null, h("h2", null, "Weather"), h("p", null, "正在读取配置…"));
      return h("div", { style: { display: "grid", gap: "18px", color: "var(--dsw-alias-label-primary)" } },
        h("div", null, h("h2", { style: { margin: "0 0 6px" } }, "Weather"), h("p", { style: { margin: 0, color: "var(--dsw-alias-label-secondary)" } }, "配置 wttr.in 天气查询插件。保存后重启生效。")),
        h("label", { "data-settings-item": "historyFile", style: { display: "grid", gap: "8px", padding: "18px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "14px", background: "var(--dsw-alias-bg-layer-1)" } },
          h("strong", null, "历史文件"),
          h("small", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "查询历史持久化的相对文件名。"),
          h("input", { value: value.historyFile, disabled: !snapshot.writable, placeholder: "weather-history.json", style: { height: "38px", padding: "0 11px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "10px", color: "var(--dsw-alias-label-primary)", background: "var(--dsw-specific-input-major)", font: "inherit" }, onChange: (event) => { void scope.set("historyFile", event.target.value); } })
        ),
        h("label", { "data-settings-item": "maxHistory", style: { display: "grid", gap: "8px", padding: "18px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "14px", background: "var(--dsw-alias-bg-layer-1)" } },
          h("strong", null, "历史上限"),
          h("small", { style: { color: "var(--dsw-alias-label-tertiary)" } }, "最多保留多少个地区的查询记录（1–5000）。"),
          h("input", { type: "number", min: 1, max: 5000, value: value.maxHistory, disabled: !snapshot.writable, placeholder: "200", style: { height: "38px", padding: "0 11px", border: "1px solid var(--dsw-alias-border-l2)", borderRadius: "10px", color: "var(--dsw-alias-label-primary)", background: "var(--dsw-specific-input-major)", font: "inherit" }, onChange: (event) => { const n = Number(event.target.value); if (Number.isFinite(n) && n >= 1 && n <= 5000) void scope.set("maxHistory", n); } })
        )
      );
    }
    function apply(ctx) {
      const scope = ctx.settingsScope.bind({ namespace: "local-weather" });
      ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "local-weather", order: 130, label: "Weather", inject: () => ({ scope }) }, WeatherSettings));
      const search = (globalThis.__DSH_SETTINGS_SEARCH__ ??= {
        sections: new Map(),
        register(sectionId, spec) {
          this.sections.set(sectionId, spec)
          return () => { this.sections.delete(sectionId) }
        },
      });
      search.register("local-weather", {
        label: "Weather",
        keywords: "天气 天气查询 wttr 预报 温度",
        items: [
          { id: "historyFile", label: "历史文件", desc: "查询历史持久化的相对文件名", keywords: "历史 文件 history" },
          { id: "maxHistory", label: "历史上限", desc: "最多保留多少地区的查询记录（1–5000）", keywords: "历史 上限 记录 maxHistory" },
        ],
      });
    }
    module.exports.inject = inject;
    module.exports.apply = apply;
    return module.exports;
  }
});
