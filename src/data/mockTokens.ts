export const primitives = {
  "blue": {
    "50": { "value": "#eff6ff", "type": "color" },
    "100": { "value": "#dbeafe", "type": "color" },
    "200": { "value": "#bfdbfe", "type": "color" },
    "300": { "value": "#93c5fd", "type": "color" },
    "400": { "value": "#60a5fa", "type": "color" },
    "500": { "value": "#3b82f6", "type": "color" },
    "600": { "value": "#2563eb", "type": "color" },
    "700": { "value": "#1d4ed8", "type": "color" },
    "800": { "value": "#1e40af", "type": "color" },
    "900": { "value": "#1e3a8a", "type": "color" }
  },
  "gray": {
    "50": { "value": "#f9fafb", "type": "color" },
    "500": { "value": "#6b7280", "type": "color" },
    "900": { "value": "#111827", "type": "color" }
  }
};

export const semantics = {
  "primary": {
    "DEFAULT": { "value": "{blue.500}", "type": "color" },
    "hover": { "value": "{blue.600}", "type": "color" },
    "active": { "value": "{blue.700}", "type": "color" },
    "foreground": { "value": "#ffffff", "type": "color" }
  },
  "background": {
    "DEFAULT": { "value": "#ffffff", "type": "color" },
    "muted": { "value": "{gray.50}", "type": "color" }
  },
  "text": {
    "primary": { "value": "{gray.900}", "type": "color" },
    "secondary": { "value": "{gray.500}", "type": "color" }
  }
};

export const components = {
  "button": {
    "primary": {
      "bg": { "value": "{primary.DEFAULT}", "type": "color" },
      "text": { "value": "{primary.foreground}", "type": "color" }
    }
  },
  "card": {
    "bg": { "value": "{background.DEFAULT}", "type": "color" },
    "border": { "value": "{gray.200}", "type": "color" }
  }
};

// Typography tokens
export const typography = {
  "fontFamily": {
    "sans": { "value": "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", "type": "fontFamily" },
    "mono": { "value": "'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace", "type": "fontFamily" },
    "serif": { "value": "Georgia, 'Times New Roman', Times, serif", "type": "fontFamily" }
  },
  "fontSize": {
    "xs": { "value": "0.75rem", "type": "fontSize" },
    "sm": { "value": "0.875rem", "type": "fontSize" },
    "base": { "value": "1rem", "type": "fontSize" },
    "lg": { "value": "1.125rem", "type": "fontSize" },
    "xl": { "value": "1.25rem", "type": "fontSize" },
    "2xl": { "value": "1.5rem", "type": "fontSize" },
    "3xl": { "value": "1.875rem", "type": "fontSize" },
    "4xl": { "value": "2.25rem", "type": "fontSize" },
    "5xl": { "value": "3rem", "type": "fontSize" },
    "6xl": { "value": "3.75rem", "type": "fontSize" }
  },
  "fontWeight": {
    "light": { "value": "300", "type": "fontWeight" },
    "normal": { "value": "400", "type": "fontWeight" },
    "medium": { "value": "500", "type": "fontWeight" },
    "semibold": { "value": "600", "type": "fontWeight" },
    "bold": { "value": "700", "type": "fontWeight" },
    "extrabold": { "value": "800", "type": "fontWeight" }
  },
  "lineHeight": {
    "none": { "value": "1", "type": "lineHeight" },
    "tight": { "value": "1.25", "type": "lineHeight" },
    "snug": { "value": "1.375", "type": "lineHeight" },
    "normal": { "value": "1.5", "type": "lineHeight" },
    "relaxed": { "value": "1.625", "type": "lineHeight" },
    "loose": { "value": "2", "type": "lineHeight" }
  },
  "letterSpacing": {
    "tighter": { "value": "-0.05em", "type": "letterSpacing" },
    "tight": { "value": "-0.025em", "type": "letterSpacing" },
    "normal": { "value": "0em", "type": "letterSpacing" },
    "wide": { "value": "0.025em", "type": "letterSpacing" },
    "wider": { "value": "0.05em", "type": "letterSpacing" },
    "widest": { "value": "0.1em", "type": "letterSpacing" }
  }
};

// Radius tokens
export const radius = {
  "none": { "value": "0", "type": "borderRadius" },
  "sm": { "value": "0.125rem", "type": "borderRadius" },
  "base": { "value": "0.25rem", "type": "borderRadius" },
  "md": { "value": "0.375rem", "type": "borderRadius" },
  "lg": { "value": "0.5rem", "type": "borderRadius" },
  "xl": { "value": "0.75rem", "type": "borderRadius" },
  "2xl": { "value": "1rem", "type": "borderRadius" },
  "3xl": { "value": "1.5rem", "type": "borderRadius" },
  "full": { "value": "9999px", "type": "borderRadius" }
};

// Shadow tokens
export const shadow = {
  "shadow-1-top": { 
    "value": "rgba(219,50,15,0.1) 0PX -1PX 2PX 0PX", 
    "type": "boxShadow",
    "codeSyntax": "--ob-shadow-1-top"
  },
  "shadow-1-bottom": { 
    "value": "rgba(219,50,15,0.1) 0PX 1PX 2PX 0PX", 
    "type": "boxShadow",
    "codeSyntax": "--ob-shadow-1-bottom"
  },
  "shadow-1-left": { 
    "value": "rgba(219,50,15,0.1) -1PX 0PX 2PX 0PX", 
    "type": "boxShadow",
    "codeSyntax": "--ob-shadow-1-left"
  },
  "shadow-1-right": { 
    "value": "rgba(219,50,15,0.1) 1PX 0PX 2PX 0PX", 
    "type": "boxShadow",
    "codeSyntax": "--ob-shadow-1-right"
  },
  "shadow-2": { 
    "value": "rgba(219,50,15,0.1) 0PX 6PX 16PX 2PX", 
    "type": "boxShadow",
    "codeSyntax": "--ob-shadow-2"
  }
};

// Spacing tokens
export const spacing = {
  "0": { "value": "0", "type": "spacing" },
  "px": { "value": "1px", "type": "spacing" },
  "0.5": { "value": "0.125rem", "type": "spacing" },
  "1": { "value": "0.25rem", "type": "spacing" },
  "1.5": { "value": "0.375rem", "type": "spacing" },
  "2": { "value": "0.5rem", "type": "spacing" },
  "2.5": { "value": "0.625rem", "type": "spacing" },
  "3": { "value": "0.75rem", "type": "spacing" },
  "3.5": { "value": "0.875rem", "type": "spacing" },
  "4": { "value": "1rem", "type": "spacing" },
  "5": { "value": "1.25rem", "type": "spacing" },
  "6": { "value": "1.5rem", "type": "spacing" },
  "7": { "value": "1.75rem", "type": "spacing" },
  "8": { "value": "2rem", "type": "spacing" },
  "9": { "value": "2.25rem", "type": "spacing" },
  "10": { "value": "2.5rem", "type": "spacing" },
  "11": { "value": "2.75rem", "type": "spacing" },
  "12": { "value": "3rem", "type": "spacing" },
  "14": { "value": "3.5rem", "type": "spacing" },
  "16": { "value": "4rem", "type": "spacing" },
  "20": { "value": "5rem", "type": "spacing" },
  "24": { "value": "6rem", "type": "spacing" },
  "28": { "value": "7rem", "type": "spacing" },
  "32": { "value": "8rem", "type": "spacing" },
  "36": { "value": "9rem", "type": "spacing" },
  "40": { "value": "10rem", "type": "spacing" },
  "44": { "value": "11rem", "type": "spacing" },
  "48": { "value": "12rem", "type": "spacing" },
  "52": { "value": "13rem", "type": "spacing" },
  "56": { "value": "14rem", "type": "spacing" },
  "60": { "value": "15rem", "type": "spacing" },
  "64": { "value": "16rem", "type": "spacing" },
  "72": { "value": "18rem", "type": "spacing" },
  "80": { "value": "20rem", "type": "spacing" },
  "96": { "value": "24rem", "type": "spacing" }
};
