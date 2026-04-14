export const DEFAULT_PROJECT_CONFIG = {
    designSystem: "acme",
    theme: "default-light"
};
export function isToolkitProjectConfig(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const record = value;
    return (typeof record.designSystem === "string" &&
        typeof record.theme === "string");
}
//# sourceMappingURL=toolkit-config.js.map