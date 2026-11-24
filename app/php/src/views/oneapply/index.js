const app = {
    currentPage: 'home',

    dom: {},

    data:{},

    baseUrl: 'http://sharpishly2.test/php/',

    url(url){
        url = this.baseUrl + url;
        app.dBug('URL',url);
        return url;
    },

    setDom(key, val) {
        this.dom[key] = val;
    },

    getDom(page) {
        return this.dom[page];
    },

    setPage(page) {
        this.currentPage = page;
        console.log({ currentPage: page });
    },

    init() {
        void this.getPage('home');
        this.gotoPage();
        // Removed synchronous navigation() here to prevent running before fetch completes
    },
    async getPage(page) {
        this.setPage(page);
        const container = this.el('app');
        if (!container) return;

        try {
            template = `/views/pages/${encodeURIComponent(page)}.html`;
            this.dBug('Template',template);
            const res = await fetch(template);
            container.innerHTML = await res.text();
            this.setDom(page, this.el(page));
            // Trigger navigation / controller execution after DOM elements exist
            this.navigation();
        } catch (error) {
            console.error(`Failed to load page: ${page}`, error);
        } 
    },

    gotoPage() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('[data-page]');
            if (target) {
                event.preventDefault();
                const page = target.getAttribute('data-page');
                if (page) void this.getPage(page);
            }
        });
    },
    async request(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error(`Failed to load URL: ${url}`, error);
            return null;
        }
    },

    el(id) {
        return document.getElementById(id);
    },

    get(endpoint) {
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        return this.request(`http://sharpishly2.test/php/${cleanEndpoint}`);
    },

    item(tag, className = '', text = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    },

    dBug(key, val) {
        console.log({ key: key, value: val });
    },
    // Add inside app object in app.js
// Add inside app object in app.js
    loadingSpinner(label = 'Thinking…') {
        const wrapper = this.item('div', 'loading-spinner-wrapper');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '0.5rem';
        wrapper.style.fontFamily = 'var(--font-mono)';
        wrapper.style.fontSize = '0.85rem';
        wrapper.style.color = 'var(--accent-cyan)';

        const spinnerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        spinnerSvg.setAttribute('width', '16');
        spinnerSvg.setAttribute('height', '16');
        spinnerSvg.setAttribute('viewBox', '0 0 24 24');
        spinnerSvg.setAttribute('fill', 'none');
        spinnerSvg.setAttribute('stroke', 'currentColor');
        spinnerSvg.setAttribute('stroke-width', '2');
        spinnerSvg.style.animation = 'spin 1s linear infinite';

        spinnerSvg.innerHTML = `
            <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
            <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor"></path>
        `;

        const textSpan = this.item('span', 'spinner-label', label);
        wrapper.appendChild(spinnerSvg);
        wrapper.appendChild(textSpan);

        return wrapper;
    },
get(endpoint) {
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        return this.request(`http://sharpishly2.test/php/${cleanEndpoint}`);
    },

    async post(endpoint, data) {
        const cleanEndpoint = endpoint.replace(/^\/+/, '');
        try {
            const res = await fetch(`http://sharpishly2.test/php/${cleanEndpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error(`Failed to post to URL: ${cleanEndpoint}`, error);
            return { success: false, error: error.message };
        }
    },
};
const RenderController = {
    async index(page, url) {
        app.dBug('RenderController', 'index() start', { page, url });
        const container = app.getDom(page);
        if (!container) {
            app.dBug('RenderController', 'index() container not found', page);
            return;
        }

        const wrapper = app.item('div', page + '-records');
        container.appendChild(wrapper);

        // Show loading spinner while fetching records
        const spinner = app.loadingSpinner('Loading records...');
        wrapper.appendChild(spinner);

        const result = await app.get(url);
        wrapper.innerHTML = ''; // Clear spinner

        const records = result?.records || result?.data || [];
        app.dBug('RenderController', 'index() records fetched', { count: records.length, url });

        if (records.length === 0) {
            this.renderEmpty(wrapper);
        } else {
            this.renderRecords(wrapper, records);
        }
    },

    renderEmpty(container) {
        app.dBug('RenderController', 'renderEmpty()');
        this.menu(container);
        container.appendChild(app.item('p', 'text-muted', 'No records found.'));
    },

    createValueElement(record) {
        const text = String(record.description || JSON.stringify(record)).trim();
        const isUrl = /^https?:\/\/\S+$/i.test(text);

        app.dBug('RenderController', 'createValueElement()', {
            id: record?.id,
            description: record?.description,
            text,
            isUrl
        });

        if (isUrl) {
            const link = app.item('a', 'metric-value', text);
            link.href = text;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            link.addEventListener('click', (event) => {
                app.dBug('RenderController', 'link clicked', {
                    href: link.href,
                    attrHref: link.getAttribute('href'),
                    defaultPrevented: event.defaultPrevented,
                    target: event.target?.tagName
                });
            });

            app.dBug('RenderController', 'created anchor element', {
                tagName: link.tagName,
                href: link.href,
                attrHref: link.getAttribute('href')
            });

            return link;
        }

        const span = app.item('span', 'metric-value', text);
        span.addEventListener('click', () => {
            app.dBug('RenderController', 'span clicked (not treated as URL)', { text });
        });

        return span;
    },

    renderRecords(container, records) {
        app.dBug('RenderController', 'renderRecords()', { count: records.length });
        this.createForm(container);
        this.menu(container);

        records.forEach((record, index) => {
            const metricItem = app.item('div', 'metric-item');

            const labelSpan = app.item('span', 'metric-label', 'Framework');

            labelSpan.onclick = function() {
                app.dBug('RenderController', 'labelSpan clicked', { index, id: record?.id });
                // TODO: Display details page
            };

            const valueEl = this.createValueElement(record);

            metricItem.appendChild(labelSpan);
            metricItem.appendChild(valueEl);

            container.appendChild(metricItem);

            app.dBug('RenderController', 'appended metricItem', {
                index,
                childCount: metricItem.children.length,
                valueTag: valueEl.tagName,
                valueHref: valueEl.href || null
            });
        });
    },

    createForm(container) {
        const form = app.item('div', 'render-form');

        const fields = [
            { 
                label: 'Title', 
                type: 'input', 
                inputType: 'text',
                name: 'title',
                placeholder: 'Enter todo title...' 
            },
            { 
                label: 'Description', 
                type: 'textarea', 
                name: 'description',
                placeholder: 'Enter todo details...' 
            }
        ];

        fields.forEach(field => {
            const group = app.item('div', 'render-form-group');
            
            const label = app.item('label', 'render-form-label', field.label);
            group.appendChild(label);

            let input;
            if (field.type === 'textarea') {
                input = app.item('textarea', 'render-form-input render-textarea');
                input.rows = 3;
            } else {
                input = app.item('input', 'render-form-input');
                input.type = field.inputType || 'text';
            }

            input.name = field.name;
            input.placeholder = field.placeholder;
            group.appendChild(input);

            form.appendChild(group);
        });

        const submitBtn = app.item('button', 'render-submit-btn', 'Save Record');
        submitBtn.type = 'button';
        submitBtn.onclick = () => this.create();
        form.appendChild(submitBtn);

        container.appendChild(form);
        return container;
    },

    menu(container) {
        const menuBar = app.item('div', 'render-menu-bar');

        const menuItems = [
            { title: 'Update', action: () => this.update() },
            { title: 'Delete', action: () => this.delete() },
            { title: 'Previous', action: () => this.previous() },
            { title: 'Next', action: () => this.next() }
        ];

        menuItems.forEach(item => {
            const btn = app.item('button', 'render-menu-btn', item.title);
            btn.type = 'button';
            btn.onclick = item.action;
            menuBar.appendChild(btn);
        });

        container.appendChild(menuBar);
        return container;
    },

    async create() { 
        app.dBug('RenderController', 'create()'); 

        const form = document.querySelector('.render-form');
        if (!form) {
            app.dBug('RenderController', 'Form not found');
            return;
        }

        const submitBtn = form.querySelector('.render-submit-btn');

        const payload = {
            title: form.querySelector('[name="title"]')?.value.trim() || '',
            description: form.querySelector('[name="description"]')?.value.trim() || ''
        };

        if (!payload.title) {
            alert('Please enter a title.');
            return;
        }

        if (submitBtn) submitBtn.disabled = true;

        // Append loading spinner next to submit button
        const spinner = app.loadingSpinner('Saving...');
        form.appendChild(spinner);

        try {
            const result = await app.post('todo/create', payload);

            app.dBug('create Todo', result?.success);

            if (result?.success) {
                form.querySelector('[name="title"]').value = '';
                form.querySelector('[name="description"]').value = '';
                await this.read();
            } else {
                alert(result?.error || 'Unable to save record.');
            }
        } catch (error) {
            console.error(error);
            alert('Unable to save record.');
        } finally {
            spinner.remove();
            if (submitBtn) submitBtn.disabled = false;
        }
    },

    async read() {
        app.dBug('RenderController', 'read()');

        const container = app.getDom('home');
        if (container) {
            container.innerHTML = '';
            await this.index('home', 'todo/read');
        }
    },

    async update() { app.dBug('RenderController', 'update()'); },
    async delete() { app.dBug('RenderController', 'delete()'); },
    async previous() { app.dBug('RenderController', 'previous()'); },
    async next() { app.dBug('RenderController', 'next()'); }
};
/* ========================================================================
    APP INIT:
    ======================================================================== */

app.init = function(){
    FeedController.init();
};
const FeedController = Object.assign(Object.create(RenderController), {
    defaultTool: 'qwen',
    lastMessageId: null,

    async init() {
        await this.index('feed', 'todo/read');
    },

    async index(page, url) {
        const feedSection = app.getDom(page); // #feed
        const target = feedSection?.querySelector('#feedList') || feedSection;

        if (!target) {
            app.dBug('FeedController', 'index() target not found', page);
            return;
        }

        const spinner = app.loadingSpinner('Loading records...');
        target.innerHTML = '';
        target.appendChild(spinner);

        const result = await app.get(url);
        target.innerHTML = '';

        const records = result?.records || result?.data || [];
        app.dBug('FeedController', 'index() records fetched', { count: records.length, url });

        if (records.length === 0) {
            this.renderEmpty(target);
        } else {
            this.renderRecords(target, records);
        }
    }
});
const state={applications:25,minutes:32,billing:'monthly',mode:'copilot',view:'generic',preset:'software'};
const storage={get(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}},remove(k){try{localStorage.removeItem(k)}catch{}}};
const gbp=new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0});

const feedItems=[
{role:'Senior Product Manager',company:'Monzo',portal:'Greenhouse ATS',match:96,status:'submitted',label:'CV Tailored & Submitted'},
{role:'Lead Data Analyst',company:'Lloyds Banking Group',portal:'Workday',match:92,status:'review',label:'Awaiting 1-Click Approval'},
{role:'Operations Lead',company:'Octopus Energy',portal:'Reed / Direct',match:89,status:'generated',label:'Cover Letter Generated'}
];

const jobPresets={
software:{title:'Software Engineer',location:'London, Hybrid',salary:'£65,000–£80,000',keywords:['Agile','CI/CD','TypeScript','AWS','Stakeholder Management','Test Automation','React','Docker'],generic:{summary:'Experienced software professional seeking a challenging engineering role.',bullets:['Worked on software projects','Used modern tools','Collaborated with colleagues','Improved systems']},tailored:{summary:'Software Engineer with verified experience delivering user-focused web products in Agile teams. Experienced in TypeScript, React, CI/CD and AWS-based delivery, with a practical focus on test automation, maintainability and stakeholder communication.',bullets:['Delivered TypeScript and React features within Agile sprint cycles, coordinating with product and design stakeholders.','Improved deployment reliability through CI/CD pipelines, automated tests and Docker-based local environments.','Partnered with product, design and engineering colleagues to translate requirements into maintainable technical solutions.','Used AWS services and observability practices to support resilient, production-ready delivery.']}},
marketing:{title:'Marketing Manager',location:'Manchester, Hybrid',salary:'£48,000–£58,000',keywords:['ROI','SEO','Campaign Management','Stakeholder Management','Google Analytics','Content Strategy','CRM','Brand'],generic:{summary:'Marketing professional with experience across campaigns and digital channels.',bullets:['Managed marketing campaigns','Used analytics tools','Worked with teams','Created content']},tailored:{summary:'Marketing Manager with verified experience planning integrated campaigns, improving acquisition performance and translating customer insight into practical content strategy. Strong working knowledge of SEO, CRM, Google Analytics and cross-functional stakeholder management.',bullets:['Planned and optimised multi-channel campaigns, using Google Analytics and CRM insight to inform targeting and creative decisions.','Developed content strategies aligned to brand positioning, customer needs and measurable acquisition goals.','Reported campaign ROI and performance to senior stakeholders, recommending practical improvements based on evidence.','Coordinated with product, sales and external partners to deliver consistent customer journeys across channels.']}},
project:{title:'Project Manager',location:'Birmingham, Hybrid',salary:'£45,000–£58,000',keywords:['Stakeholder Management','Risk Management','Agile','PRINCE2','Budget Management','Reporting','Change Management','Delivery'],generic:{summary:'Project professional with experience managing teams and delivering projects.',bullets:['Managed projects','Reported progress','Worked with stakeholders','Managed risks']},tailored:{summary:'Project Manager with verified experience leading cross-functional delivery, managing competing priorities and maintaining clear stakeholder communication. Experienced in Agile delivery, risk management, budget oversight and structured reporting.',bullets:['Led cross-functional delivery plans, coordinating priorities, dependencies and risks across business and technical teams.','Maintained stakeholder engagement through clear reporting, decision logs and practical escalation routes.','Managed project budgets and change requests, balancing scope, schedule and quality requirements.','Applied Agile practices and structured governance to keep delivery aligned with business outcomes.']}}
};

const portals=[
['Reed','Job board'],['Totaljobs','Job board'],['CV-Library','Job board'],['Indeed','Job board'],['LinkedIn','Job board'],['Glassdoor','Job board'],['CWJobs','Job board'],['NHS Jobs','Public sector'],['Civil Service Jobs','Public sector'],['Workday','Direct ATS'],['Greenhouse','Direct ATS'],['Lever','Direct ATS'],['iCIMS','Direct ATS'],['Oracle Taleo','Direct ATS'],['SmartRecruiters','Direct ATS'],['Teamtailor','Direct ATS']
];

const features=[
['Register Once, Sync Everywhere','Enter employment history, education, UK right-to-work status and notice period once—never retype a 10-step Workday form again.',['One universal candidate profile','Reusable work history and education','Right-to-work details stored securely']],
['Semantic AI Job Matching & Deduplication','Aggregates roles across 45+ portals, removes duplicate recruiter reposts and ranks jobs by true skill fit, salary in £ GBP and remote/hybrid rules.',['Cross-portal role discovery','Duplicate repost detection','Salary and work-pattern filters']],
['Per-Role UK CV & Cover Letter Rewriting','Generates an ATS-optimised, British-English CV and bespoke cover letter tailored to every job description without fabricating experience.',['Role-specific CV versions','British English formatting','Verified-achievement alignment']],
['Co-Pilot & Auto-Pilot Application Modes','Choose Co-Pilot to review and approve every tailored packet in one click, or Auto-Pilot to apply while you sleep.',['Co-Pilot enabled by default','Clear approval controls','Auto-Pilot opt-in']],
['Unified Application & Interview Tracker','Replaces messy spreadsheets with one live Kanban pipeline tracking Matched → Tailored → Submitted → Viewed → Interview Booked across every portal.',['Single application timeline','Status and receipt tracking','Interview reminders']],
['AI Interview Prep & Salary Intelligence','Generates role-specific interview questions based on the exact tailored CV sent, plus UK market salary benchmarks.',['CV-aligned interview questions','UK salary benchmarks','Preparation checklists']]
];

const plans=[
{name:'Free Starter',monthly:0,quarterly:0,description:'Explore the platform and apply manually with AI support.',items:['Universal profile','Cross-portal job search & deduplication','5 AI-tailored CVs per month','Co-Pilot applications','Unified application tracker'],cta:'Start Free',featured:false},
{name:'Career Accelerator',monthly:19,quarterly:14.25,description:'For active job seekers applying across multiple portals.',items:['Unlimited AI CV & cover letter tailoring','150 Co-Pilot or Auto-Pilot applications/month','Workday, Greenhouse and Reed support','ATS keyword scorer','Priority email support'],cta:'Choose Career Accelerator',featured:true},
{name:'Executive / Unlimited',monthly:39,quarterly:29.25,description:'For senior candidates running a high-volume, multi-channel search.',items:['Unlimited Auto-Pilot applications','Priority direct-ATS submission','AI mock interview coach','LinkedIn profile optimiser','Dedicated onboarding session'],cta:'Choose Executive',featured:false}
];

const faqs=[
['Does OneApply AI invent fake skills or experience on my CV?','No. OneApply AI strictly restructures and aligns verified achievements from your Master CV to the language and requirements of a role. It does not create qualifications, employers, dates or experience that you have not provided.'],
['Can I review applications before they are sent to employers?','Yes. Co-Pilot review mode is enabled by default. You can review the tailored CV, cover letter and screening answers, make edits, and approve or reject each application before it is sent.'],
['How does it handle Workday, Greenhouse, and multi-stage UK portals?','Where an integration is supported, OneApply pre-fills saved profile fields, employment history, right-to-work information and notice-period details. Complex or employer-specific questions are routed to Co-Pilot review rather than submitted automatically.'],
['Are my CV and personal details shared with third-party recruiters?','Your data is used to deliver the service you request and is not sold. We apply GDPR-aligned safeguards, encryption in transit and at rest, role-based access and clear retention controls. You can update or delete your Master CV and profile data.'],
['Does it format CVs for the UK market rather than US resumes?','Yes. The default output follows UK CV conventions: concise two-page A4 formatting, British English spelling, no photograph or date of birth, and achievement-focused bullet points.'],
['Can Auto-Pilot submit inaccurate information?','No. Auto-Pilot only uses approved profile data and configured application rules. If a required question is unclear, missing or conflicts with your Master CV, the application is held for your review.']
];

const capabilities=[
['View Transitions',()=>Boolean(document.startViewTransition),'Smooth visual changes between major views.'],
['Scroll-driven animations',()=>CSS.supports('animation-timeline: scroll()'),'Scroll-linked visual effects.'],
['Container queries',()=>CSS.supports('container-type: inline-size'),'Cards adapt to available space.'],
['Container style queries',()=>CSS.supports('container style queries'),'Presentation can respond to custom properties.'],
['CSS nesting',()=>CSS.supports('selector(&)'),'Organised component styles.'],
['@scope',()=>CSS.supports('selector(@scope)'),'Bounded component styling.'],
['Anchor positioning',()=>CSS.supports('anchor-name: --x'),'Popover positioning relative to triggers.'],
['Popover API',()=>Boolean(HTMLElement.prototype.hasOwnProperty?.('popover')),'Accessible lightweight overlays.'],
['Dialog element',()=>Boolean(window.HTMLDialogElement),'Native accessible modal dialogs.'],
[':has()',()=>CSS.supports('selector(:has(a))'),'Parent-state styling.'],
['field-sizing',()=>CSS.supports('field-sizing: content'),'Controls can grow with content.'],
['Trusted Types',()=>Boolean(window.trustedTypes),'Safer HTML insertion controls.'],
['Navigation API',()=>Boolean(window.navigation),'Modern client-side navigation.'],
['Web Animations API',()=>Boolean(window.Element.prototype.animate),'JavaScript-driven interaction motion.'],
['Canvas 2D',()=>Boolean(document.createElement('canvas').getContext('2d')),'Procedural visual artwork.'],
['Web Audio',()=>Boolean(window.AudioContext||window.webkitAudioContext),'Optional user-initiated sound.'],
['Clipboard API',()=>Boolean(navigator.clipboard),'One-tap copying.'],
['Web Share',()=>Boolean(navigator.share),'Native sharing where available.'],
['localStorage',()=>{try{localStorage.setItem('__oneapply','1');localStorage.removeItem('__oneapply');return true}catch{return false}},'Saves preferences on this device.']
];

const icon=(d)=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width','14');svg.setAttribute('height','14');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','2');svg.setAttribute('aria-hidden','true');const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',d);svg.append(p);return svg};

const renderFeed=()=>{
const list=document.getElementById('feedList');list.replaceChildren();
feedItems.forEach(item=>{
const li=document.createElement('li');li.className='feed-item';
const left=document.createElement('div');
const portal=document.createElement('span');portal.className='portal-tag';portal.textContent=item.portal;
const match=document.createElement('div');match.className='match';match.textContent=`${item.match}% AI Match`;
left.append(portal,match);
const middle=document.createElement('div');
const role=document.createElement('strong');role.textContent=`${item.role} @ ${item.company}`;
const status=document.createElement('div');status.className=`status status-${item.status}`;
if(state.mode==='copilot'&&item.status!=='submitted')status.textContent='Review Required';else status.textContent=item.label;
middle.append(role,status);
const action=document.createElement('button');action.className='btn btn-ghost btn-sm';
action.textContent=state.mode==='copilot'&&item.status!=='submitted'?'Review':'View Receipt';
action.addEventListener('click',()=>{
document.getElementById('feedNote').textContent=state.mode==='copilot'&&item.status!=='submitted'?`Co-Pilot review opened for ${item.role} at ${item.company}. You can approve or edit before submission.`:`Receipt available for ${item.role} at ${item.company}.`;
});
li.append(left,middle,action);list.append(li);
});
document.getElementById('feedNote').textContent=state.mode==='copilot'?'Co-Pilot Mode is enabled by default: review each tailored CV, cover letter and screening answers before it is sent.':'Auto-Pilot Mode can submit suitable applications automatically. You can switch back to Co-Pilot at any time.';
};

const renderPortalGrid=()=>{
const grid=document.getElementById('portalGrid');grid.replaceChildren();
portals.forEach(([name,type])=>{const div=document.createElement('div');div.className='portal';const strong=document.createElement('strong');strong.textContent=name;const span=document.createElement('span');span.textContent=type;div.append(strong,span);grid.append(div)});
};

const renderFeatures=()=>{
const wrap=document.getElementById('featureCards');wrap.replaceChildren();
features.forEach(([title,description,items])=>{
const card=document.createElement('article');card.className='card reveal';
const label=document.createElement('span');label.className='card-label';label.textContent='Platform capability';
const h3=document.createElement('h3');h3.textContent=title;
const p=document.createElement('p');p.textContent=description;
const ul=document.createElement('ul');
items.forEach(text=>{const li=document.createElement('li');li.append(icon('m5 13 4 4L19 7'),document.createTextNode(text));ul.append(li)});
card.append(label,h3,p,ul);wrap.append(card);
});
};

const renderPricing=()=>{
const wrap=document.getElementById('pricingCards');wrap.replaceChildren();
plans.forEach(plan=>{
const card=document.createElement('article');card.className='card price-card reveal'+(plan.featured?' featured':'');
if(plan.featured){const badge=document.createElement('span');badge.className='popular';badge.textContent='Most Popular';card.append(badge)}
const name=document.createElement('h3');name.textContent=plan.name;
const price=document.createElement('div');price.className='price';
const amount=state.billing==='monthly'?plan.monthly:plan.quarterly;
price.textContent=amount===0?'£0':gbp.format(amount);
const suffix=document.createElement('span');suffix.textContent=state.billing==='monthly'?' /month':' /month, billed quarterly';
price.append(suffix);
const desc=document.createElement('p');desc.textContent=plan.description;
const ul=document.createElement('ul');ul.className='plan-list';
plan.items.forEach(text=>{const li=document.createElement('li');li.append(icon('m5 13 4 4L19 7'),document.createTextNode(text));ul.append(li)});
const cta=document.createElement('a');cta.className='btn '+(plan.featured?'btn-primary':'btn-ghost');cta.href='#upload';cta.textContent=plan.cta;
card.append(name,price,desc,ul,cta);wrap.append(card);
});
};

const renderFaq=()=>{
const wrap=document.getElementById('faqList');wrap.replaceChildren();
faqs.forEach(([q,a])=>{const details=document.createElement('details');details.className='faq-item';const summary=document.createElement('summary');summary.textContent=q;const answer=document.createElement('div');answer.className='faq-answer';answer.textContent=a;details.append(summary,answer);wrap.append(details)});
};

const detectKeywords=(text)=>{
const all=[...new Set(Object.values(jobPresets).flatMap(p=>p.keywords))];
const lower=text.toLowerCase();
return all.filter(k=>lower.includes(k.toLowerCase()));
};

const renderTailor=()=>{
const preset=state.preset==='custom'?jobPresets.software:jobPresets[state.preset];
const text=document.getElementById('jobDescription').value.trim()||`${preset.title} role requiring ${preset.keywords.join(', ')}.`;
const keywords=detectKeywords(text);
const keywordList=document.getElementById('keywordList');keywordList.replaceChildren();
if(!keywords.length){const p=document.createElement('p');p.className='help';p.textContent='No preset keywords detected. Add role-specific requirements to see keyword highlighting.';keywordList.append(p)}
keywords.forEach(k=>{const span=document.createElement('span');span.className='keyword';span.textContent=k;keywordList.append(span)});

const output=document.getElementById('cvOutput');output.replaceChildren();
const data=state.view==='generic'?preset.generic:preset.tailored;
const title=document.createElement('div');title.className='cv-title';title.textContent=state.view==='generic'?'Generic Master CV':'OneApply AI Tailored UK CV';
const line=document.createElement('p');line.className='cv-line';line.textContent=`Target: ${preset.title} • ${preset.location} • ${preset.salary}`;
const summary=document.createElement('p');summary.className='cv-line';summary.textContent=data.summary;
output.append(title,line,summary);
data.bullets.forEach(text=>{const div=document.createElement('div');div.className='cv-bullet';div.append(icon('m5 13 4 4L19 7'),document.createTextNode(text));output.append(div)});
const score=document.getElementById('atsScore');
const value=state.view==='generic'?54:95;
score.textContent=`${value}%`;score.className='score '+(value>=80?'good':'low');
storage.set('oneapply-tailor',{preset:state.preset,view:state.view});
};

const calculateRoi=()=>{
const apps=state.applications,mins=state.minutes;
const weeklyMinutes=apps*mins;
const monthlyHours=weeklyMinutes*4.33/60;
const days=monthlyHours/7.5;
const boost=68;
const baselineInterviews=apps*4.33*0.08;
const interviews=Math.round(baselineInterviews*(1+boost/100));
return{monthlyHours,days,boost,interviews};
};

const renderRoi=()=>{
const result=calculateRoi();
document.getElementById('hoursSaved').textContent=`${result.monthlyHours.toFixed(1)} hours`;
document.getElementById('daysReclaimed').textContent=`${result.days.toFixed(1)} days`;
document.getElementById('atsBoost').textContent=`+${result.boost}%`;
document.getElementById('monthlyInterviews').textContent=`${result.interviews} interviews`;
const visual=document.getElementById('dayVisual');visual.replaceChildren();
const fullDays=Math.floor(result.days);
for(let i=0;i<7;i++){const day=document.createElement('span');day.className='day'+(i<fullDays?'':' empty');visual.append(day)}
document.getElementById('applicationsRange').value=state.applications;
document.getElementById('applicationsInput').value=state.applications;
document.getElementById('minutesRange').value=state.minutes;
document.getElementById('minutesInput').value=state.minutes;
storage.set('oneapply-roi',{applications:state.applications,minutes:state.minutes});
};

const bindPair=(rangeId,numberId,key)=>{
const range=document.getElementById(rangeId),number=document.getElementById(numberId);
range.addEventListener('input',()=>{state[key]=Number(range.value);renderRoi()});
number.addEventListener('input',()=>{const value=Number(number.value);if(Number.isFinite(value)){state[key]=Math.min(Number(range.max),Math.max(Number(range.min),value));renderRoi()}});
};

const initMode=()=>{
const copilot=document.getElementById('copilotMode'),autopilot=document.getElementById('autopilotMode');
copilot.addEventListener('click',()=>{state.mode='copilot';copilot.setAttribute('aria-pressed','true');autopilot.setAttribute('aria-pressed','false');renderFeed()});
autopilot.addEventListener('click',()=>{state.mode='autopilot';copilot.setAttribute('aria-pressed','false');autopilot.setAttribute('aria-pressed','true');renderFeed()});
};

const initTailor=()=>{
const form=document.getElementById('tailorForm');
const presetSelect=document.getElementById('jobPreset');
const description=document.getElementById('jobDescription');
const saved=storage.get('oneapply-tailor',null);
if(saved){state.preset=saved.preset||'software';state.view=saved.view||'generic';presetSelect.value=state.preset}
const setPreset=()=>{
state.preset=presetSelect.value;
if(state.preset!=='custom'){const preset=jobPresets[state.preset];description.value=`${preset.title} — ${preset.location}\nSalary: ${preset.salary}\n\nWe are looking for someone with experience in ${preset.keywords.join(', ')}. You will work with stakeholders to deliver measurable outcomes.`}
renderTailor();
};
presetSelect.addEventListener('change',setPreset);
form.addEventListener('submit',e=>{e.preventDefault();state.view='tailored';document.getElementById('genericView').setAttribute('aria-pressed','false');document.getElementById('tailoredView').setAttribute('aria-pressed','true');renderTailor()});
document.getElementById('genericView').addEventListener('click',()=>{state.view='generic';document.getElementById('genericView').setAttribute('aria-pressed','true');document.getElementById('tailoredView').setAttribute('aria-pressed','false');renderTailor()});
document.getElementById('tailoredView').addEventListener('click',()=>{state.view='tailored';document.getElementById('genericView').setAttribute('aria-pressed','false');document.getElementById('tailoredView').setAttribute('aria-pressed','true');renderTailor()});
setPreset();
};

const initRoi=()=>{
const saved=storage.get('oneapply-roi',null);
if(saved){state.applications=Math.min(100,Math.max(5,saved.applications||25));state.minutes=Math.min(60,Math.max(15,saved.minutes||32))}
bindPair('applicationsRange','applicationsInput','applications');
bindPair('minutesRange','minutesInput','minutes');
document.getElementById('resetRoi').addEventListener('click',()=>{state.applications=25;state.minutes=32;renderRoi()});
renderRoi();
};

const initBilling=()=>{
const monthly=document.getElementById('monthlyBilling'),quarterly=document.getElementById('quarterlyBilling');
monthly.addEventListener('click',()=>{state.billing='monthly';monthly.setAttribute('aria-pressed','true');quarterly.setAttribute('aria-pressed','false');renderPricing()});
quarterly.addEventListener('click',()=>{state.billing='quarterly';monthly.setAttribute('aria-pressed','false');quarterly.setAttribute('aria-pressed','true');renderPricing()});
};

const initCapabilities=()=>{
const button=document.getElementById('capabilityButton'),panel=document.getElementById('capabilityPanel'),list=document.getElementById('capabilityList');
capabilities.forEach(([label,test,explanation])=>{let active=false;try{active=Boolean(test())}catch{}
const li=document.createElement('li');li.className='capability';li.title=explanation;
const name=document.createElement('span');name.textContent=label;
const status=document.createElement('span');status.className=active?'cap-ok':'cap-off';status.textContent=active?'Active':'Unavailable';
li.append(name,status);list.append(li)});
button.addEventListener('click',()=>{const open=panel.dataset.open==='true';panel.dataset.open=String(!open);button.setAttribute('aria-expanded',String(!open))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.dataset.open==='true'){panel.dataset.open='false';button.setAttribute('aria-expanded','false');button.focus()}});
};

const initReveal=()=>{
const items=document.querySelectorAll('.reveal');
if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){items.forEach(i=>i.classList.add('is-visible'));return}
const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}})},{rootMargin:'0px 0px -10% 0px'});
items.forEach(item=>observer.observe(item));
};

const initTheme=()=>{
const saved=storage.get('oneapply-theme','system');
document.documentElement.dataset.theme=saved;
const apply=()=>{if(document.documentElement.dataset.theme==='system'){document.documentElement.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}};
apply();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);
};

const init=()=>{
document.getElementById('year').textContent=new Date().getFullYear();
initTheme();renderFeed();initMode();renderPortalGrid();renderFeatures();initTailor();initRoi();initBilling();renderPricing();renderFaq();initCapabilities();initReveal();
};
init();

document.addEventListener('DOMContentLoaded', () => {

    alert('hello');

    app.init();


});

