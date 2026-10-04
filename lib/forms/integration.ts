import type { FormSchema } from "./types.ts";

export function sampleAnswers(schema: FormSchema) {
  return Object.fromEntries(schema.fields.map(field => [field.id, field.type === "checkbox" ? true : field.type === "number" ? 1 : field.type === "email" ? "test@example.com" : field.type === "select" ? field.options![0] : "Test enquiry".slice(0, field.maxLength ?? 100)]));
}

function html(value: string) { return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }

export function websiteSnippet({ endpoint, key, name, schema, formId, format, test }: { endpoint: string; key: string; name: string; schema: FormSchema; formId: string; format: "html" | "javascript"; test: boolean }) {
  const config = JSON.stringify({ endpoint: test ? endpoint.replace(/\/submissions$/, "/verify") : endpoint, key, fields: schema.fields, formId, test }).replaceAll("<", "\\u003c");
  const js = `(() => {
  const config = ${config};
  const form = document.getElementById(config.formId);
  if (!form) throw new Error("d3CRM form element not found.");
  const controls = Object.getOwnPropertyDescriptor(HTMLFormElement.prototype, "elements").get.call(form);
  const result = form.querySelector("[data-d3-result]") || form.appendChild(document.createElement("p"));
  result.setAttribute("role", "status");
  result.setAttribute("aria-live", "polite");
  let pending = false;
  form.addEventListener("input", event => event.target.setCustomValidity?.(""));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const values = new FormData(form);
    const body = { _gotcha: String(values.get("_gotcha") || "") };
    for (const field of config.fields) {
      const value = String(values.get(field.id) || "").trim();
      if (field.type === "checkbox") body[field.id] = values.has(field.id);
      else if (value || field.required) body[field.id] = field.type === "number" ? Number(value) : value;
    }
    const params = new URLSearchParams(location.search);
    const context = { landing_page: location.origin + location.pathname };
    if (context.landing_page.length > 2048) delete context.landing_page;
    if (document.referrer) {
      const referrer = new URL(document.referrer);
      const value = referrer.origin + referrer.pathname;
      if (value.length <= 2048) context.referrer = value;
    }
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      if (params.get(key)) context[key] = params.get(key).slice(0, 200);
    }
    body._context = context;
    const buttons = [...form.querySelectorAll('button[type="submit"], input[type="submit"], button:not([type])')];
    const disabled = buttons.map(button => button.disabled);
    pending = true;
    buttons.forEach(button => button.disabled = true);
    result.textContent = config.test ? "Checking connection..." : "Sending...";
    try {
      const response = await fetch(config.endpoint, {
        method: "POST", headers: { "Content-Type": "application/json", "X-Form-Key": config.key },
        body: JSON.stringify(body)
      });
      const reply = await response.json();
      if (!response.ok) {
        for (const [id, message] of Object.entries(reply.fields || {})) {
          const control = controls.namedItem(id);
          control?.setCustomValidity?.(String(message));
        }
        form.reportValidity();
        throw new Error(reply.error || "Unable to submit. Please try again.");
      }
      result.textContent = config.test ? "Connection checked. No enquiry was created." : "Thank you. Your enquiry was received.";
      if (!config.test) HTMLFormElement.prototype.reset.call(form);
    } catch (error) {
      result.textContent = error instanceof Error ? error.message : "Network error. Please try again.";
    } finally {
      pending = false;
      buttons.forEach((button, index) => button.disabled = disabled[index]);
    }
  });
})();`;
  if (format === "javascript") return js;
  const fields = schema.fields.map(field => {
    const attributes = `name="${html(field.id)}"${field.required ? " required" : ""}${field.maxLength ? ` maxlength="${field.maxLength}"` : ""}`;
    const input = field.type === "textarea" ? `<textarea ${attributes}></textarea>` : field.type === "select" ? `<select ${attributes}><option value="">Choose an option</option>${field.options!.map(value => `<option value="${html(value)}">${html(value)}</option>`).join("")}</select>` : `<input type="${field.type}" ${attributes}${field.type === "number" ? ' step="any"' : ""}>`;
    return `  <label>${html(field.label)}\n    ${input}\n  </label>`;
  }).join("\n");
  return `<form id="${html(formId)}" aria-label="${html(name)}">
${fields}
  <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
  <button type="submit">${test ? "Test connection" : "Send enquiry"}</button>
  <p data-d3-result role="status" aria-live="polite"></p>
</form>
<script>
${js}
</script>`;
}
