/**
 * Nuxt DS demo allowlist – generated from custom/design-systems/nuxt-ui-v4/
 * Do not edit by hand. Run: npm run generate-nuxt-ds-catalog
 */

export interface NuxtDemoAllowlistEntry {
  kind: string
  name: string
  key: string
  variantAxes?: Record<string, string[]>
  defaultVariant?: Record<string, string>
}

export const NUxtDemoAllowlist: NuxtDemoAllowlistEntry[] = [
  {
    "kind": "component_set",
    "name": "Alert",
    "key": "bc3212c8e58738e4c2c15848f6565ced7f29f550",
    "variantAxes": {
      "🎨 Color": [
        "Neutral",
        "Primary",
        "Secondary",
        "Success",
        "Info",
        "Warning",
        "Error"
      ],
      "◆ Variant": [
        "Solid",
        "Outline",
        "Soft",
        "Subtle"
      ],
      "◆ LeadingSlot": [
        "Avatar",
        "Icon"
      ],
      "👁️ Description": [
        "True",
        "False"
      ],
      "👁️ Action": [
        "False",
        "True"
      ]
    },
    "defaultVariant": {
      "🎨 Color": "Neutral",
      "◆ Variant": "Solid",
      "◆ LeadingSlot": "Avatar",
      "👁️ Description": "True",
      "👁️ Action": "True"
    }
  },
  {
    "kind": "component_set",
    "name": "ButtonPrimary",
    "key": "dd5e57b760caeabfb383b04d688522683cfa3494",
    "variantAxes": {
      "◆ Variant": [
        "Solid",
        "Outline",
        "Soft",
        "Subtle",
        "Ghost",
        "Link"
      ],
      "📏 Size": [
        "xs",
        "sm",
        "md",
        "lg",
        "xl"
      ],
      "🚦 State": [
        "Default",
        "Disabled",
        "Focus",
        "Hover"
      ],
      "◆ Slot": [
        "Icon",
        "Avatar"
      ],
      "👁️ Square": [
        "False",
        "True"
      ]
    },
    "defaultVariant": {
      "◆ Variant": "Solid",
      "📏 Size": "xs",
      "🚦 State": "Default",
      "◆ Slot": "Icon",
      "👁️ Square": "False"
    }
  },
  {
    "kind": "component_set",
    "name": "ButtonGroup",
    "key": "cec81dfa007b0ce0615bb6e70ba212665da481e3",
    "variantAxes": {
      "📏 Size": [
        "xs",
        "sm",
        "md",
        "lg",
        "xl"
      ],
      "◆ Variant": [
        "Buttons",
        "Input + button"
      ],
      "⇅ Orientation": [
        "Vertical",
        "Horizontal"
      ]
    },
    "defaultVariant": {
      "📏 Size": "xs",
      "◆ Variant": "Buttons",
      "⇅ Orientation": "Horizontal"
    }
  },
  {
    "kind": "component",
    "name": "Card",
    "key": "5957e381e7b40e79f284eee938da8a792cbb341e"
  },
  {
    "kind": "component_set",
    "name": "FormField",
    "key": "2da5fa89857c9f17ffd2cd82ba82343606a3d28c",
    "variantAxes": {
      "📏 Size": [
        "xs",
        "sm",
        "md",
        "lg",
        "xl"
      ],
      "◆ Input": [
        "Input",
        "InputNumber",
        "PinInput",
        "Textarea"
      ],
      "⇅ Orientation": [
        "Vertical",
        "Horizontal"
      ],
      "👁️ Error": [
        "False",
        "True"
      ]
    },
    "defaultVariant": {
      "📏 Size": "xs",
      "◆ Input": "Input",
      "⇅ Orientation": "Vertical",
      "👁️ Error": "False"
    }
  },
  {
    "kind": "component_set",
    "name": "InputSoft",
    "key": "b4474e50d12dbd9efe2a05c3351e66cd147b58c3",
    "variantAxes": {
      "🎨 Color": [
        "Neutral",
        "Primary",
        "Error"
      ],
      "📏 Size": [
        "xs",
        "sm",
        "md",
        "lg",
        "xl"
      ],
      "🚦 State": [
        "Default",
        "Hover (focus)",
        "Disabled"
      ],
      "◆ LeadingSlot": [
        "Icon",
        "Span",
        "Avatar",
        "None"
      ],
      "◆ TrailingSlot": [
        "Icon",
        "Span",
        "None"
      ]
    },
    "defaultVariant": {
      "🎨 Color": "Neutral",
      "📏 Size": "xs",
      "🚦 State": "Default",
      "◆ LeadingSlot": "Icon",
      "◆ TrailingSlot": "Icon"
    }
  },
  {
    "kind": "component_set",
    "name": "InputOutline",
    "key": "1c4b817bfcfeb1201f3b3604d90cb82ac34f0a9e",
    "variantAxes": {
      "🎨 Color": [
        "Neutral",
        "Primary",
        "Error"
      ],
      "📏 Size": [
        "xs",
        "sm",
        "md",
        "lg",
        "xl"
      ],
      "🚦 State": [
        "Default",
        "Disabled",
        "Focus"
      ],
      "◆ LeadingSlot": [
        "Icon",
        "Span",
        "Avatar",
        "None"
      ],
      "◆ TrailingSlot": [
        "Icon",
        "None",
        "Span"
      ]
    },
    "defaultVariant": {
      "🎨 Color": "Neutral",
      "📏 Size": "xs",
      "🚦 State": "Default",
      "◆ LeadingSlot": "Icon",
      "◆ TrailingSlot": "Icon"
    }
  },
  {
    "kind": "component_set",
    "name": "Modal",
    "key": "3e4b76a86ae3855d63e6ac5e41a1677b19d0efd7",
    "variantAxes": {
      "👁️  Background": [
        "False",
        "True"
      ]
    },
    "defaultVariant": {
      "👁️  Background": "False"
    }
  },
  {
    "kind": "component_set",
    "name": "Toast",
    "key": "739fe6b9c5b841854eaaa9075f066f4f4206d040",
    "variantAxes": {
      "🎨 Color": [
        "Primary",
        "Neutral",
        "Secondary",
        "Success",
        "Info",
        "Warning",
        "Error"
      ],
      "◆ LeadingSlot": [
        "Avatar",
        "Icon",
        "None"
      ],
      "👁️ Description": [
        "False",
        "True"
      ],
      "👁️ Actions": [
        "False",
        "True"
      ],
      "◆ Progress": [
        "0",
        "100"
      ]
    },
    "defaultVariant": {
      "🎨 Color": "Primary",
      "◆ LeadingSlot": "None",
      "👁️ Description": "True",
      "👁️ Actions": "False",
      "◆ Progress": "100"
    }
  }
]
