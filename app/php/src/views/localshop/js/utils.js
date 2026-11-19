/* Small DOM, formatting and browser capability utilities. */
export const $=(selector,root=document)=>root.querySelector(selector);
export const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
export const money=value=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(Number(value)||0);
export const escapeText=value=>String(value??"");
export function make(tag,attrs={},children=[]){const el=document.createElement(tag);for(const [key,value] of Object.entries(attrs)){if(key==="class")el.className=value;else if(key==="text")el.textContent=value;else if(key.startsWith("aria-")||key.startsWith("data-")||key==="type"||key==="href"||key==="value")el.setAttribute(key,String(value));}for(const child of children)el.append(child);return el}
export function capabilities(){const css=condition=>{try{return CSS.supports(condition)}catch{return false}};let storage=false;try{localStorage.setItem("__ne_test","1");localStorage.removeItem("__ne_test");storage=true}catch{};return [
 ["View Transitions API",!!document.startViewTransition,"Adds gentle transitions between major views."],
 ["Scroll-driven animation",css("animation-timeline: scroll()"),"Adds a subtle scroll-linked ticker effect."],
 ["Container queries",css("container-type: inline-size"),"Lets cards adapt to their available space."],
 ["Container style queries",css("container-type: style"),"Allows components to respond to style context."],
 ["CSS nesting",css("selector(&)"),"Keeps related component styles together."],
 ["@scope",css("@scope (.panel) {}"),"Can bound styles to a component."],
 ["Anchor positioning",css("anchor-name: --a"),"Can position contextual UI near its trigger."],
 ["Popover API","popover" in HTMLElement.prototype,"Supports native non-modal popovers."],
 ["dialog",!!HTMLDialogElement,"Provides accessible modal detail views."],
 [":has()",css("selector(:has(*))"),"Enables parent-state styling."],
 ["field-sizing",css("field-sizing: content"),"Can size form fields to their content."],
 ["Trusted Types","trustedTypes" in window,"Can help enforce safe DOM injection."],
 ["Navigation API","navigation" in window,"Offers enhanced client-side navigation."],
 ["Web Animations API",!!Element.prototype.animate,"Enables small interactive motion."],
 ["Canvas 2D",!!document.createElement("canvas").getContext("2d"),"Available for optional visualisations."],
 ["Web Audio",!!window.AudioContext,"Available for user-started audio experiences."],
 ["Clipboard API",!!navigator.clipboard?.writeText,"Can copy information with permission."],
 ["Web Share API",!!navigator.share,"Can share a link through the device."],
 ["localStorage",storage,"Keeps your preferences and demo data in this browser."]
]}
export function transition(update){if(document.startViewTransition&&!matchMedia("(prefers-reduced-motion: reduce)").matches){document.startViewTransition(update)}else update()}
