/**
 * Structured design system metadata — single source of truth for all four DSes.
 *
 * This module has ZERO external imports. That is intentional and load-bearing:
 * schema/dist must be self-contained when vendored by an external host.
 * Do NOT add imports from DS adapter packages here.
 *
 * Used by resolveDesignSystem(), searchComponents(), and getPromptEnrichmentSegment().
 */
const COMPONENT_TABLE = [
    // kind               acme              orbit             nuxt-ui           jazz               casual description                                             jazz description
    ["page", "AcmePage", "OrbitPage", "UPage", "JazzPage", "Root page layout wrapper.", "Root page layout wrapper — structured, data-dense."],
    ["section", "AcmeSection", "OrbitSection", "USection", "JazzSection", "Structural section container for layout grouping.", "Structural section container. Used in data dashboards and form layouts."],
    ["text", "AcmeText", "OrbitText", "UText", "JazzText", "Generic text node. Renders body, eyebrow, or subhead content.", "Text node for body copy, axis labels, and table annotations."],
    ["button", "AcmeButton", "OrbitButton", "UButton", "JazzButton", "Interactive CTA button. Variants: primary, secondary, ghost.", "Enterprise CTA button. Primary navy, outlined secondary. 4px radius."],
    ["card", "AcmeCard", "OrbitCard", "UCard", "JazzCard", "Content card with border, shadow, and background tokens.", "Data card with tight border, subtle shadow, and white/surface-1 background."],
    ["heading", "AcmeHeading", "OrbitHeading", "UHeading", "JazzHeading", "Heading node H1–H4.", "Heading H1–H4 using Open Sans. Used in dashboards, report titles."],
    ["input", "AcmeInput", "OrbitInput", "UInput", "JazzInput", "Single-line text input field.", "Single-line text input. 4px radius. Minimal decoration."],
    ["select", "AcmeSelect", "OrbitSelect", "USelect", "JazzSelect", "Dropdown select control.", "Dropdown select control. Enterprise form style."],
    ["textarea", "AcmeTextarea", "OrbitTextarea", "UTextarea", "JazzTextarea", "Multi-line text input.", "Multi-line text input for structured data entry."],
    ["checkbox", "AcmeCheckbox", "OrbitCheckbox", "UCheckbox", "JazzCheckbox", "Binary boolean checkbox input.", "Binary boolean checkbox. Used in filters and bulk-select tables."],
    ["radio", "AcmeRadio", "OrbitRadio", "URadio", "JazzRadio", "Single-select radio input.", "Single-select radio. Used in settings and filter panels."],
    ["switch", "AcmeSwitch", "OrbitSwitch", "USwitch", "JazzSwitch", "Toggle switch for on/off state.", "Toggle switch for feature flags and dashboard settings."],
    ["badge", "AcmeBadge", "OrbitBadge", "UBadge", "JazzBadge", "Non-interactive status indicator (e.g. 'New', 'Beta').", "Status badge. Uses semantic color tokens (gain/loss/warning/error)."],
    ["label", "AcmeLabel", "OrbitLabel", "ULabel", "JazzLabel", "Form field label text.", "Form field label. 11px/600 uppercase for table headers."],
    ["header-nav", "AcmeNav", "OrbitNav", "UNav", "JazzNav", "Top navigation bar with brand, links, and actions.", "Top navigation bar. 52px height. L1 app nav."],
    ["side-nav", "AcmeSideNav", "OrbitSideNav", "USideNav", "JazzSideNav", "Vertical sidebar navigation with grouped links.", "Sidebar navigation. Used in app-shell layouts."],
    ["footer", "AcmeFooter", "OrbitFooter", "UFooter", "JazzFooter", "Page footer with links and legal text.", "Page footer with legal text and secondary links."],
    ["modal-dialog", "AcmeModal", "OrbitModal", "UModal", "JazzModal", "Modal dialog overlaying the page.", "Modal dialog for confirmations and data entry overlays."],
    ["alert-banner", "AcmeAlert", "OrbitAlert", "UAlert", "JazzAlert", "Full-width inline status/feedback alert.", "Inline alert for critical status messages and data warnings."],
    ["testimonial", "AcmeTestimonial", "OrbitTestimonial", "UTestimonial", "JazzTestimonial", "Social proof block with quote and attribution.", "Attribution block for quotes. Used in reports and summaries."],
    ["faq", "AcmeFaq", "OrbitFaq", "UFaq", "JazzFaq", "Accordion-style FAQ section.", "Collapsible FAQ section for help and documentation pages."],
    ["feature-grid", "AcmeFeatureGrid", "OrbitFeatureGrid", "UFeatureGrid", "JazzFeatureGrid", "Grid of feature or benefit cards.", "Feature grid for product capability listings."],
    ["cta-section", "AcmeCtaSection", "OrbitCtaSection", "UCtaSection", "JazzCtaSection", "Standalone call-to-action section with headline and primary action.", "Call-to-action section. Navy background (#002F6C)."],
    ["app-shell", "AcmeAppShell", "OrbitAppShell", "UAppShell", "JazzAppShell", "Full-page app shell with header, sidebar, and main content area.", "Enterprise app shell with fixed header, collapsible sidebar, main content."],
];
function buildComponents(nameCol, descCol) {
    return COMPONENT_TABLE.map(row => ({
        canonicalKind: row[0],
        componentName: row[nameCol],
        description: row[descCol],
    }));
}
// ── Registry ──────────────────────────────────────────────────────────────────
export const DS_METADATA_REGISTRY = [
    {
        id: "acme",
        displayName: "Acme",
        tier: "casual",
        defaultTheme: "default-light",
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        primaryColor: "#00C16A",
        defaultRadius: "6px",
        character: "Clean, friendly, modern SaaS. Bright green primary. Generous whitespace. Rounded corners.",
        iconSet: "Heroicons (outline)",
        components: buildComponents(1, 5),
    },
    {
        id: "orbit",
        displayName: "Orbit",
        tier: "casual",
        defaultTheme: "dark",
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        primaryColor: "#818CF8",
        defaultRadius: "6px",
        character: "Dark-first. Dense, technical, developer-facing. Indigo/violet accent on near-black surfaces.",
        iconSet: "Lucide (outline, 1.5px stroke)",
        components: buildComponents(2, 5),
    },
    {
        id: "nuxt-ui",
        displayName: "Nuxt UI",
        tier: "casual",
        defaultTheme: "default-light",
        fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
        primaryColor: "#00C16A",
        defaultRadius: "8px",
        character: "Clean, modern, Tailwind-native. Green primary. Slightly more rounded than Acme. Nuxt ecosystem conventions.",
        iconSet: "Lucide via Iconify",
        components: buildComponents(3, 5),
    },
    {
        id: "jazz",
        displayName: "Jazz",
        tier: "enterprise",
        defaultTheme: "default-light",
        fontFamily: "'Open Sans', 'Helvetica Neue', helvetica, arial, sans-serif",
        primaryColor: "#005EB8",
        defaultRadius: "4px",
        character: "Conservative, structured, high-trust. Navy/white palette. Tight 4px radius. Data-dense layouts.",
        iconSet: "Tabler Icons (ti ti-*, 1.5px stroke)",
        components: buildComponents(4, 6),
    },
];
/** Look up metadata by DS id. Returns undefined for unknown ids. */
export function getDSMetadata(designSystem) {
    return DS_METADATA_REGISTRY.find(m => m.id === designSystem);
}
//# sourceMappingURL=ds-metadata.js.map