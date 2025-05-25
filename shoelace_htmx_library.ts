// shoelace_htmx_library.ts
import { htmlEscape } from "https://deno.land/x/html_escape@v1.1.5/html_escape.ts";

export class ShoelaceHTMX {
  /**
   * Renders an HTML element with the given tag name, attributes, and inner HTML.
   *
   * @param tagName - The name of the HTML tag to render (e.g., "div", "sl-button").
   * @param attributes - An object where keys are attribute names and values are their
   *                     corresponding values. Attribute values will be HTML-escaped.
   *                     Boolean attributes: if true, the attribute name is present; if false, omitted.
   * @param innerHTML - Optional. The HTML content to be placed between the opening and
   *                    closing tags. This content is assumed to be safe or pre-escaped.
   * @returns The complete HTML string for the element.
   */
  static renderElement(tagName: string, attributes: Record<string, any>, innerHTML?: string): string {
    const attributeStrings: string[] = [];

    for (const [key, value] of Object.entries(attributes)) {
      if (value === false) {
        // Omit boolean attributes that are false
        continue;
      }
      if (value === true) {
        // Add boolean attributes that are true (e.g., <input checked>)
        attributeStrings.push(key);
      } else if (typeof value === 'string' || typeof value === 'number') {
        attributeStrings.push(`${key}="${htmlEscape(value.toString())}"`);
      } else if (value !== null && value !== undefined) {
        // For other types (e.g., objects for style, though not explicitly handled here yet),
        // ensure they are stringified and escaped if they make sense as an attribute.
        // For now, primarily expecting string/number/boolean.
        attributeStrings.push(`${key}="${htmlEscape(String(value))}"`);
      }
    }

    const attrsString = attributeStrings.length > 0 ? ` ${attributeStrings.join(" ")}` : "";

    if (innerHTML !== undefined) {
      return `<${tagName}${attrsString}>${innerHTML}</${tagName}>`;
    } else {
      // Self-closing tags are not explicitly handled here, assuming most elements will have content
      // or be Shoelace components that don't rely on XML self-closing syntax (e.g. <sl-input /> vs <sl-input></sl-input>)
      // HTML5 allows non-void elements to be unclosed if they have no content, but explicit closing is safer.
      // For void elements (like <input>, <img>), this will produce <tag></tag> which is fine in HTML5.
      return `<${tagName}${attrsString}></${tagName}>`;
    }
  }

  // Optional but recommended interface for renderButton options
  static SlButtonOptions: {
    id?: string;
    label: string; // The text content of the button
    variant?: 'default' | 'primary' | 'success' | 'neutral' | 'warning' | 'danger' | 'text';
    size?: 'small' | 'medium' | 'large';
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    loading?: boolean;
    outline?: boolean;
    circle?: boolean;
    // HTMX specific attributes
    hxClick?: string; 
    hxPost?: string;
    hxGet?: string;
    hxPut?: string;
    hxDelete?: string;
    hxTarget?: string;
    hxSwap?: string;
    hxIndicator?: string;
    hxConfirm?: string;
    // Allow any other Shoelace button props or other hx-* attributes
    [key: string]: any; 
  }

  /**
   * Renders a Shoelace <sl-button> element with the given options.
   *
   * @param options - An object containing options for the button, including label,
   *                  variant, HTMX attributes, etc.
   * @returns The HTML string for the <sl-button> element.
   */
  static renderButton(options: typeof ShoelaceHTMX.SlButtonOptions): string {
    const {
      label,
      variant,
      size,
      type,
      disabled,
      loading,
      outline,
      circle,
      id,
      hxClick,
      hxPost,
      hxGet,
      hxPut,
      hxDelete,
      hxTarget,
      hxSwap,
      hxIndicator,
      hxConfirm,
      ...otherAttributes // Collects any other properties passed in options
    } = options;

    const attributes: Record<string, any> = { ...otherAttributes };

    // Standard Shoelace attributes
    if (id) attributes.id = id;
    if (variant) attributes.variant = variant;
    if (size) attributes.size = size;
    if (type) attributes.type = type;
    if (disabled) attributes.disabled = true; // renderElement handles boolean true
    if (loading) attributes.loading = true;
    if (outline) attributes.outline = true;
    if (circle) attributes.circle = true;

    // HTMX attributes
    if (hxClick) attributes['hx-click'] = hxClick;
    if (hxPost) attributes['hx-post'] = hxPost;
    if (hxGet) attributes['hx-get'] = hxGet;
    if (hxPut) attributes['hx-put'] = hxPut;
    if (hxDelete) attributes['hx-delete'] = hxDelete;
    if (hxTarget) attributes['hx-target'] = hxTarget;
    if (hxSwap) attributes['hx-swap'] = hxSwap;
    if (hxIndicator) attributes['hx-indicator'] = hxIndicator;
    if (hxConfirm) attributes['hx-confirm'] = hxConfirm;
    
    // The label is text content, so it should be escaped before being used as innerHTML
    const escapedLabel = htmlEscape(label);

    return ShoelaceHTMX.renderElement("sl-button", attributes, escapedLabel);
  }

  // Type definition for renderCheckbox options
  static SlCheckboxOptions: {
    id?: string;
    label?: string; // The text label for the checkbox (innerHTML)
    name?: string;
    value?: string;
    checked?: boolean;
    disabled?: boolean;
    indeterminate?: boolean;
    // HTMX specific attributes
    hxGet?: string;
    hxPost?: string;
    hxPut?: string;
    hxDelete?: string;
    hxPatch?: string; // Added for completeness
    hxTrigger?: string; // Allow explicit override
    hxTarget?: string;
    hxSwap?: string;
    hxIndicator?: string;
    hxConfirm?: string; // Though less common on checkbox, included for completeness
    // Allow any other Shoelace checkbox props or other hx-* attributes
    [key: string]: any;
  }

  /**
   * Renders a Shoelace <sl-checkbox> element with the given options.
   *
   * @param options - An object containing options for the checkbox.
   * @returns The HTML string for the <sl-checkbox> element.
   */
  static renderCheckbox(options: typeof ShoelaceHTMX.SlCheckboxOptions): string {
    const {
      label,
      id,
      name,
      value,
      checked,
      disabled,
      indeterminate,
      hxGet,
      hxPost,
      hxPut,
      hxDelete,
      hxPatch,
      hxTrigger,
      hxTarget,
      hxSwap,
      hxIndicator,
      hxConfirm,
      ...otherAttributes
    } = options;

    const attributes: Record<string, any> = { ...otherAttributes };

    // Standard Shoelace attributes
    if (id) attributes.id = id;
    if (name) attributes.name = name;
    if (value) attributes.value = value;
    if (checked) attributes.checked = true;
    if (disabled) attributes.disabled = true;
    if (indeterminate) attributes.indeterminate = true;

    // HTMX attributes
    const hxActionSpecified = hxGet || hxPost || hxPut || hxDelete || hxPatch;

    if (hxActionSpecified) {
      attributes['hx-trigger'] = hxTrigger || 'sl-change'; // Default to sl-change if an action is set
      if (hxGet) attributes['hx-get'] = hxGet;
      if (hxPost) attributes['hx-post'] = hxPost;
      if (hxPut) attributes['hx-put'] = hxPut;
      if (hxDelete) attributes['hx-delete'] = hxDelete;
      if (hxPatch) attributes['hx-patch'] = hxPatch;
    } else if (hxTrigger) {
      // If only hx-trigger is specified without an action, include it.
      attributes['hx-trigger'] = hxTrigger;
    }
    
    if (hxTarget) attributes['hx-target'] = hxTarget;
    if (hxSwap) attributes['hx-swap'] = hxSwap;
    if (hxIndicator) attributes['hx-indicator'] = hxIndicator;
    if (hxConfirm) attributes['hx-confirm'] = hxConfirm;

    const escapedLabel = label ? htmlEscape(label) : "";

    return ShoelaceHTMX.renderElement("sl-checkbox", attributes, escapedLabel);
  }
}
