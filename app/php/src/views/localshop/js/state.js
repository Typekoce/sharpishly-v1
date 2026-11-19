/* Central state, versioned persistence and cross-tab updates. */
const KEY = "neighbourhood-enterprise-v1";
const defaults = {version:1,theme:"light",reduceMotion:false,updates:false,favourites:[],snapshot:{businessName:"",businessType:"Retail shop",stage:"Just an idea",startupCost:2500,monthlyCost:850,averageSale:28,margin:45,businessNote:""},thoughts:[],profile:null};
let state = load();
const listeners = new Set();
function safeParse(raw){try{return raw?JSON.parse(raw):null}catch{return null}}
function load(){try{const saved=safeParse(localStorage.getItem(KEY));return saved&&saved.version===1?{...structuredClone(defaults),...saved,snapshot:{...defaults.snapshot,...saved.snapshot}}:structuredClone(defaults)}catch{return structuredClone(defaults)}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));return true}catch{return false}}
function emit(){for(const fn of listeners)fn(state)}
export const Store = {
 get:()=>state,
 subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
 update(patch){state={...state,...patch};const saved=persist();emit();return saved},
 updateSnapshot(patch){state={...state,snapshot:{...state.snapshot,...patch}};const saved=persist();emit();return saved},
 toggleFavourite(id){const set=new Set(state.favourites);set.has(id)?set.delete(id):set.add(id);return this.update({favourites:[...set]})},
 addThought(value){return this.update({thoughts:[{id:crypto.randomUUID?.()||String(Date.now()),text:value,created:new Date().toISOString()},...state.thoughts].slice(0,30)})},
 export(){return JSON.stringify(state,null,2)},
 import(data){if(!data||data.version!==1||typeof data!=="object")throw new Error("This file isn't a recognised Neighbourhood Enterprise backup.");const clean={...structuredClone(defaults),...data,snapshot:{...defaults.snapshot,...(data.snapshot||{})}};if(!Array.isArray(clean.favourites)||!Array.isArray(clean.thoughts))throw new Error("The saved data appears to be incomplete.");state=clean;persist();emit()},
 reset(){state=structuredClone(defaults);persist();emit()}
};
try{const channel=new BroadcastChannel("neighbourhood-enterprise");channel.onmessage=e=>{if(e.data?.type==="refresh"){state=load();emit()}};Store.subscribe(()=>channel.postMessage({type:"refresh"}))}catch{}
