// game.js
const gravitiy = 70;
const jump = -28;
const GroundLevel = 4;
const scale = 8;
const drawingscale = 2;
let width = 96;
let height = 42;

const DEBUG_QUERY = new URLSearchParams(window.location.search);
const DEBUG_FAST_TIMELINE = DEBUG_QUERY.has("fast");
const DEBUG_HARDSHIP_START = DEBUG_QUERY.has("hardship");
const TIMELINE_MULTIPLIER = DEBUG_FAST_TIMELINE ? 80 : 0.93;
const YEAR_DURATION_SECONDS = 14;
const keys = trackkey();

Array.prototype.last = function(){
    return this[this.length - 1];
};

class FrameTracker {
    constructor(scale){
        this.scale = scale;
        this.frames = {};
    }

    add(actorsize, framesname, framesnumber, backgroundphoto, framesspeed){
        if(!this.frames[framesname]){
            this.frames[framesname] = {};
        }
        this.frames[framesname] = {
            backgroundphoto,
            anmtionframes: this.generateFrames(actorsize, framesnumber, this.scale),
            framesnumber,
            index: 0,
            framesspeed
        };
        const preloadUrl = new URL(backgroundphoto, window.location.href).href;
        if(!(Array.from(document.head.getElementsByTagName("link")).find((e)=> e.href == preloadUrl))){
            let preload = document.createElement("link");
            preload.href = preloadUrl;
            preload.rel = "preload";
            preload.as = "image";
            document.head.appendChild(preload);
        }
    }

    generateFrames(actorsize, framesnumber, scale){
        let res = [];
        for(let i = 0; i < framesnumber; i++){
            if(i == 0) res.push([(actorsize.x - actorsize.y) * scale / 2, -0.2]);
            else res.push([res[i - 1][0] - actorsize.x * 2 * scale, -0.2]);
        }
        return res;
    }

    nextFrame(framesname){
        let frame = this.frames[framesname].anmtionframes[Math.trunc(this.frames[framesname].index)];
        this.frames[framesname].index = (this.frames[framesname].index + this.frames[framesname].framesspeed) % this.frames[framesname].anmtionframes.length;
        return frame;
    }

    update(actorhtmlelement, animtionname, frameWidth, frameHeight = frameWidth){
        for(let animtion in this.frames){
            if(this.frames[animtion].index != 0 && animtion != animtionname){
                this.rest(animtion);
            }
        }
        let frameData = this.frames[animtionname];
        let frameIndex = Math.trunc(frameData.index);
        this.nextFrame(animtionname);
        actorhtmlelement.style.backgroundImage = `url(${this.frames[animtionname].backgroundphoto})`;
        actorhtmlelement.style.backgroundSize = `${frameWidth * frameData.framesnumber}px ${frameHeight}px`;
        actorhtmlelement.style.backgroundRepeat = "no-repeat";
        actorhtmlelement.style.backgroundPosition = `${-frameIndex * frameWidth}px 0px`;
    }

    rest(framesname){
        this.frames[framesname].index = 0;
    }
}

class Vector{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }

    add(vector){
        this.x += vector.x;
        this.y += vector.y;
    }

    times(factor){
        this.x *= factor;
        this.y *= factor;
    }
}

function rounddecimat(d){
    return Number.parseFloat(d.toFixed(2));
}

function overlap(actor1, actor2){
    const box1 = actor1.getCollisionBox ? actor1.getCollisionBox() : {
        x: actor1.postionVector.x,
        y: actor1.postionVector.y,
        width: actor1.size.x,
        height: actor1.size.y
    };
    const box2 = actor2.getCollisionBox ? actor2.getCollisionBox() : {
        x: actor2.postionVector.x,
        y: actor2.postionVector.y,
        width: actor2.size.x,
        height: actor2.size.y
    };
    return box1.x + box1.width >= box2.x
    && box1.x <= box2.x + box2.width
    && box1.y + box1.height >= box2.y
    && box1.y <= box2.y + box2.height;
}

function randomrange(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeelment(tag, attrs, childeren = []){
    let element = document.createElement(tag);
    for(let key in attrs){
        if(key == "text"){
            element.textContent = attrs[key];
        }
        else{
            element.setAttribute(key, attrs[key]);
        }
    }
    for(let child of childeren){
        element.appendChild(child);
    }
    return element;
}

function escapeHtml(value = ""){
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function trackkey(){
    const keys = {
        arrowup: false,
        arrowdown: false,
        start: false
    };
    window.addEventListener("keydown", (e)=>{
        if(e.key === "ArrowUp" || e.key === " "){
            keys.arrowup = true;
            e.preventDefault();
        }
        if(e.key === "ArrowDown" || e.key.toLowerCase() === "s"){
            keys.arrowdown = true;
            e.preventDefault();
        }
        if(e.key === "Enter"){
            keys.start = true;
            e.preventDefault();
        }
    });
    window.addEventListener("keyup", (e)=>{
        if(e.key === "ArrowUp" || e.key === " "){
            keys.arrowup = false;
        }
        if(e.key === "ArrowDown" || e.key.toLowerCase() === "s"){
            keys.arrowdown = false;
        }
        if(e.key === "Enter"){
            keys.start = false;
        }
    });
    window.addEventListener("touchstart", ()=>{
        keys.arrowup = true;
    });
    window.addEventListener("touchend", ()=>{
        keys.arrowup = false;
    });
    return keys;
}

function clamp(value, min = 0, max = 100){
    return Math.max(min, Math.min(max, value));
}

const RESOURCE_MAX = 88;
const READINESS_MAX = 100;
const POSITIVE_RESOURCE_SCALE = 0.55;
const NEGATIVE_RESOURCE_SCALE = 1.45;
const POSITIVE_READINESS_SCALE = 0.75;

const RESOURCE_LABELS = {
    money: "Money",
    food: "Food",
    hope: "Hope",
    readiness: "War Readiness"
};

const RESOURCE_ORDER = ["money", "food", "hope", "readiness"];
const VISIBLE_RESOURCE_ORDER = ["money", "food", "hope"];
const ICON_ONLY_COLLECTIBLES = {
    Bread: "bread",
    "Soup Bowl": "soup",
    Coins: "coins",
    "Water Can": "water",
    "New Deal Wheel": "mystery",
    "Production Crate": "mystery"
};

const HISTORICAL_IMAGES = {
    crash: {
        src: "assets/historical/crash-1929.jpg",
        alt: "Crowd outside the New York Stock Exchange during the 1929 crash"
    },
    bank: {
        src: "assets/historical/bank-run.jpg",
        alt: "Crowd gathered outside American Union Bank during a Depression-era bank run"
    },
    breadline: {
        src: "assets/historical/breadline.jpg",
        alt: "Great Depression breadline in New York City"
    },
    hooverville: {
        src: "assets/historical/hooverville.jpg",
        alt: "Hooverville sign and temporary shelter during the Great Depression"
    },
    fdr: {
        src: "assets/historical/fdr-1933.jpg",
        alt: "Franklin D. Roosevelt portrait from 1933"
    },
    ccc: {
        src: "assets/historical/ccc.jpg",
        alt: "Civilian Conservation Corps workers during the New Deal"
    },
    wpa: {
        src: "assets/historical/wpa.jpg",
        alt: "Works Progress Administration workers on a public works project"
    },
    socialSecurity: {
        src: "assets/historical/social-security.jpg",
        alt: "Franklin D. Roosevelt signing the Social Security Act"
    },
    dust: {
        src: "assets/historical/dust-bowl.jpg",
        alt: "Child photographed during Dust Bowl-era farm hardship"
    },
    migration: {
        src: "assets/historical/migration-west.jpg",
        alt: "Dorothea Lange photograph of a migrant mother"
    },
    europeWar: {
        src: "assets/historical/war-europe.jpg",
        alt: "Civilian victim after German air attack in Poland in 1939"
    },
    lendLease: {
        src: "assets/historical/lend-lease.jpg",
        alt: "American spare parts arriving in England under Lend-Lease"
    },
    pearlHarbor: {
        src: "assets/historical/pearl-harbor.jpg",
        alt: "Photograph from the Japanese attack on Pearl Harbor"
    },
    rationing: {
        src: "assets/historical/rationing.jpg",
        alt: "World War II ration stamp book"
    },
    rosie: {
        src: "assets/historical/rosie.jpg",
        alt: "We Can Do It poster associated with women in wartime industry"
    },
    incarceration: {
        src: "assets/historical/incarceration.png",
        alt: "Members of the Mochida family awaiting evacuation during Japanese American incarceration"
    },
    warEnds: {
        src: "assets/historical/war-ends.jpg",
        alt: "Crowd in Times Square celebrating V-J Day in 1945"
    }
};

function formatEffect(effect){
    return RESOURCE_ORDER
        .filter((key)=> effect[key])
        .map((key)=> `${effect[key] > 0 ? "+" : ""}${effect[key]} ${RESOURCE_LABELS[key]}`)
        .join(", ");
}

const SOURCE_POPUPS = {
    breadlines: {
        title: "Breadlines and Relief",
        source: "National Archives: Great Depression and New Deal photographs",
        excerpt: "APUSH lens: breadlines show how hunger and unemployment overwhelmed local charity before federal relief expanded.",
        link: "https://www.archives.gov/research/still-pictures/new-deal"
    },
    crash: {
        title: "Primary Source: Crash-Era Headlines",
        source: "Library of Congress classroom timeline",
        excerpt: "APUSH lens: newspapers help connect the stock crash to bank failures, falling demand, and job losses.",
        link: "https://www.loc.gov/classroom-materials/united-states-history-primary-source-timeline/great-depression-and-world-war-ii-1929-1945/"
    },
    banking: {
        title: "Bank Holiday and FDIC",
        source: "FDIC history timeline, 1930-1939",
        excerpt: "APUSH lens: the Emergency Banking Act, bank inspections, and FDIC insurance tried to stop panic after bank failures.",
        link: "https://www.fdic.gov/history/1930-1939"
    },
    newDeal: {
        title: "New Deal Work Programs",
        source: "National Archives: New Deal resources",
        excerpt: "APUSH lens: CCC, CWA, PWA, WPA, and TVA show relief and recovery through federal jobs and public works.",
        link: "https://www.archives.gov/research/alic/reference/new-deal.html"
    },
    dustBowl: {
        title: "Dust Bowl and Migration",
        source: "Library of Congress Dust Bowl timeline",
        excerpt: "Steinbeck's phrase “dusted out, tractored out” captured migration pressure from drought, debt, and mechanization.",
        link: "https://www.loc.gov/classroom-materials/united-states-history-primary-source-timeline/great-depression-and-world-war-ii-1929-1945/dust-bowl/"
    },
    pearlHarbor: {
        title: "Pearl Harbor Dispatches",
        source: "Library of Congress Pearl Harbor primary source",
        excerpt: "APUSH lens: Pearl Harbor changed public debate from neutrality to formal war and total mobilization.",
        link: "https://www.loc.gov/item/mcc.002/"
    },
    homeFront: {
        title: "Rationing and the Home Front",
        source: "National Archives: America on the Homefront",
        excerpt: "APUSH lens: OPA rationing and price controls connected household choices to wartime production and inflation control.",
        link: "https://www.archives.gov/boston/exhibits/homefront"
    },
    rosie: {
        title: "Women in Wartime Industry",
        source: "Library of Congress: We Can Do It poster",
        excerpt: "APUSH lens: Rosie symbolism points to women entering industrial jobs while wartime gains remained unequal and contested.",
        link: "https://www.loc.gov/resource/gdcwdl.wdl_02733/"
    },
    incarceration: {
        title: "Civil Liberties in Wartime",
        source: "National Archives: Japanese American incarceration",
        excerpt: "APUSH lens: Executive Order 9066 and incarceration show how wartime fear produced a major civil liberties violation.",
        link: "https://www.archives.gov/education/lessons/japanese-relocation/"
    },
    warEnds: {
        title: "War Ends, Economy Transformed",
        source: "Library of Congress World War II headline",
        excerpt: "APUSH lens: wartime federal spending, production, and military service helped end Depression-era mass unemployment.",
        link: "https://newsroom.loc.gov/world-war-ii-headline/a/7eecbb0e-e9da-4092-9b19-18d6b7b86fe6"
    }
};

function sourcePopupFor(data = {}){
    const text = `${data.label || ""} ${(data.factIds || []).join(" ")}`;
    if(/bread|soup|relief|unemployment-rises|breadlines/i.test(text)) return SOURCE_POPUPS.breadlines;
    if(/newspaper|stock-crash|buying-on-margin/i.test(text)) return SOURCE_POPUPS.crash;
    if(/fdic|bank|deposit|holiday/i.test(text)) return SOURCE_POPUPS.banking;
    if(/ccc|cwa|pwa|wpa|tva|social-security|wagner|work crew|job card|paycheck/i.test(text)) return SOURCE_POPUPS.newDeal;
    if(/water|map west|work flyer|migration|dry-dust|farm/i.test(text)) return SOURCE_POPUPS.dustBowl;
    if(/radio|pearl|lend-lease|congress|declares-war/i.test(text)) return SOURCE_POPUPS.pearlHarbor;
    if(/ration|wpb|opa|war bond|shipyard|factory paycheck|war job/i.test(text)) return SOURCE_POPUPS.homeFront;
    if(/rosie|women/i.test(text)) return SOURCE_POPUPS.rosie;
    if(/incarceration|civil liberties/i.test(text)) return SOURCE_POPUPS.incarceration;
    if(/war ends|homecoming|wwii-ends/i.test(text)) return SOURCE_POPUPS.warEnds;
    return null;
}

const SPECIAL_MINIGAMES = {
    "new-deal-wheel": {
        id: "new-deal-wheel",
        type: "wheel",
        title: "New Deal Program Wheel",
        kicker: "Mystery Box",
        prompt: "Spin for a New Deal program.",
        context: "The New Deal was not one single policy. It included relief programs for immediate hardship, recovery programs for jobs and production, and reform programs meant to prevent future collapse. Spin the wheel to see which program your family encounters and how it changes your resources.",
        factIds: ["ccc", "cwa", "pwa", "wpa", "tva", "fdic", "social-security-act"],
        outcomes: [
            { label: "CCC", effect: { money: 7, hope: 8 }, explanation: "The Civilian Conservation Corps gave young men conservation jobs and sent wages home to families.", factIds: ["ccc"] },
            { label: "CWA", effect: { money: 6, food: 5 }, explanation: "The Civil Works Administration offered short-term emergency work during the worst unemployment crisis.", factIds: ["cwa"] },
            { label: "PWA", effect: { money: 7, hope: 5 }, explanation: "The Public Works Administration funded large construction projects and tried to stimulate recovery.", factIds: ["pwa"] },
            { label: "WPA", effect: { money: 9, food: 6, hope: 7 }, explanation: "The Works Progress Administration created public jobs building roads, schools, parks, and civic buildings.", factIds: ["wpa"] },
            { label: "TVA", effect: { hope: 10, money: 4 }, explanation: "The Tennessee Valley Authority brought jobs, electricity, and flood-control projects to parts of the South.", factIds: ["tva"] },
            { label: "FDIC", effect: { hope: 9 }, explanation: "The FDIC helped protect deposits and rebuilt public faith in banks after failures.", factIds: ["fdic"] },
            { label: "Social Security", effect: { hope: 9 }, explanation: "The Social Security Act created a long-term federal safety net for older Americans.", factIds: ["social-security-act"] }
        ]
    },
    "production-crate": {
        id: "production-crate",
        type: "sort",
        title: "War Production Crate",
        kicker: "Mystery Box",
        prompt: "Sort the crate for the home front.",
        context: "By 1942, wartime mobilization redirected factories, workers, and household consumption. The War Production Board pushed industrial conversion while the Office of Price Administration managed rationing and prices. Pick the crate that best supports mobilization without pretending wartime sacrifice was easy.",
        factIds: ["war-production-board", "office-price-administration", "rationing"],
        options: [
            { label: "WPB contract", effect: { money: 8, readiness: 8 }, explanation: "The War Production Board directed factories toward planes, ships, tanks, and weapons. That production created jobs and strengthened mobilization.", factIds: ["war-production-board", "wartime-shipyard-factory-jobs"] },
            { label: "OPA ration book", effect: { food: 7, readiness: 5 }, explanation: "The Office of Price Administration used rationing and price controls to manage scarcity. Families sacrificed some choice so supplies could support the war effort.", factIds: ["office-price-administration", "rationing"] },
            { label: "Extra consumer goods", effect: { food: 3, hope: 3, readiness: -4 }, explanation: "Consumer goods helped families feel normal, but wartime factories prioritized military production. This choice shows the tension between home comfort and total war.", factIds: ["war-production-board", "rationing"] }
        ]
    }
};

const FACTS = [
    { id: "stock-crash-1929", year: "1929", label: "1929 Stock Market Crash" },
    { id: "bank-failures", year: "1929-1933", label: "Bank failures spread financial panic" },
    { id: "buying-on-margin", year: "1929", label: "Buying on margin increased crash-era risk" },
    { id: "unemployment-rises", year: "1930-1932", label: "Unemployment rose sharply during the Depression" },
    { id: "breadlines", year: "1930-1932", label: "Breadlines showed hunger and weak relief systems" },
    { id: "hoovervilles", year: "1930-1932", label: "Hoovervilles formed as families lost homes" },
    { id: "farm-foreclosures", year: "1930s", label: "Farm foreclosures pushed rural families into crisis" },
    { id: "dry-dust-bowl-conditions", year: "1930s", label: "Dry Great Plains conditions devastated farms" },
    { id: "migration-west", year: "1930s", label: "Many farm families migrated west for work" },
    { id: "fdr-elected-1932", year: "1932", label: "Franklin D. Roosevelt won the 1932 election" },
    { id: "first-hundred-days", year: "1933", label: "The First Hundred Days launched rapid New Deal action" },
    { id: "emergency-banking-act", year: "1933", label: "Emergency Banking Act tried to restore trust in banks" },
    { id: "bank-holiday", year: "1933", label: "Bank Holiday temporarily closed banks for inspection" },
    { id: "fireside-chats", year: "1933", label: "Fireside Chats explained federal action by radio" },
    { id: "fdic", year: "1933", label: "FDIC protected bank deposits and encouraged confidence" },
    { id: "ccc", year: "1933", label: "Civilian Conservation Corps, CCC, hired young men for conservation work" },
    { id: "cwa", year: "1933", label: "Civil Works Administration, CWA, provided short-term work relief" },
    { id: "pwa", year: "1933", label: "Public Works Administration, PWA, funded large public projects" },
    { id: "wpa", year: "1935", label: "Works Progress Administration, WPA, created jobs in public works" },
    { id: "tva", year: "1933", label: "Tennessee Valley Authority, TVA, brought jobs, power, and flood control" },
    { id: "aaa", year: "1933", label: "Agricultural Adjustment Act, AAA, tried to raise farm prices" },
    { id: "social-security-act", year: "1935", label: "Social Security Act created a federal safety net for older Americans" },
    { id: "wagner-act", year: "1935", label: "Wagner Act protected workers' rights to organize" },
    { id: "new-deal-opposition", year: "1930s", label: "New Deal critics argued over federal power and recovery" },
    { id: "court-packing", year: "1937", label: "Court-packing controversy raised constitutional concerns" },
    { id: "neutrality-acts", year: "1930s", label: "Neutrality Acts reflected fear of another war" },
    { id: "germany-invades-poland", year: "1939", label: "Germany invaded Poland in 1939" },
    { id: "britain-france-declare-war", year: "1939", label: "Britain and France declared war on Germany" },
    { id: "isolationism-debate", year: "1939-1941", label: "Americans debated isolationism and aid" },
    { id: "cash-and-carry", year: "1939", label: "Cash-and-carry allowed belligerents to buy supplies and transport them" },
    { id: "arsenal-of-democracy", year: "1940", label: "Arsenal of Democracy framed U.S. industrial support for Allies" },
    { id: "lend-lease", year: "1941", label: "Lend-Lease sent aid to nations fighting the Axis" },
    { id: "selective-training-service-act", year: "1940", label: "Selective Training and Service Act created the first peacetime draft" },
    { id: "pearl-harbor", year: "1941", label: "Japan attacked Pearl Harbor on December 7, 1941" },
    { id: "us-declares-war", year: "1941", label: "The United States declared war after Pearl Harbor" },
    { id: "war-production-board", year: "1942", label: "War Production Board directed wartime industrial conversion" },
    { id: "office-price-administration", year: "1942", label: "Office of Price Administration managed prices and rationing" },
    { id: "rationing", year: "1942-1945", label: "Rationing limited goods to support the war effort" },
    { id: "war-bonds", year: "1940s", label: "War bonds helped finance federal wartime spending" },
    { id: "rosie-women-industry", year: "1940s", label: "Rosie the Riveter symbolized women entering wartime industry" },
    { id: "african-american-industrial-migration", year: "1940s", label: "African Americans migrated to industrial jobs while facing discrimination" },
    { id: "japanese-american-incarceration", year: "1942", label: "Japanese American incarceration was a serious civil liberties violation" },
    { id: "wartime-shipyard-factory-jobs", year: "1942-1945", label: "Factory and shipyard employment expanded rapidly during the war" },
    { id: "unemployment-falls-mobilization", year: "1940s", label: "Unemployment fell as war industries and military service expanded" },
    { id: "wwii-ends-1945", year: "1945", label: "World War II ended in 1945" }
];

const FACTS_BY_ID = Object.fromEntries(FACTS.map((fact)=> [fact.id, fact]));

// APUSH timeline system: all stages, facts, choices, news, obstacles, and rewards live here.
const APUSH_CONTENT = {
    startingResources: {
        money: 44,
        food: 46,
        hope: 52,
        readiness: 0
    },
    stages: [
        {
            key: "crash",
            years: "1929",
            startYear: 1929,
            endYear: 1929,
            label: "1929: Stock Market Crash",
            duration: 80,
            visual: "city",
            factIds: ["stock-crash-1929", "buying-on-margin", "bank-failures"],
            narratives: [
                { time: 2, text: "1929: Stock prices collapse.", factIds: ["stock-crash-1929"] },
                { time: 18, text: "Buying on margin turns falling prices into deeper losses.", factIds: ["buying-on-margin"] },
                { time: 38, text: "Many families lose savings and confidence.", factIds: ["bank-failures"] },
                { time: 62, text: "Businesses cut jobs as panic spreads.", factIds: ["unemployment-rises"] }
            ],
            choices: ["savings-1929"],
            obstacles: [
                { label: "Margin Call", effect: { money: -7, hope: -3 }, factIds: ["buying-on-margin"] },
                { label: "Bank Panic", effect: { money: -6, hope: -5 }, factIds: ["bank-failures"] },
                { label: "Lost Savings", effect: { money: -8 }, factIds: ["bank-failures"] },
                { label: "Factory Layoff", effect: { money: -5, hope: -4 }, factIds: ["unemployment-rises"] }
            ],
            collectibles: [
                { label: "Bread", effect: { food: 8 }, factIds: ["breadlines"] },
                { label: "Coins", effect: { money: 6 } },
                { label: "Newspaper", effect: { hope: 3 }, factIds: ["stock-crash-1929"] }
            ],
            props: ["Stock Ticker", "Bank", "Headline"]
        },
        {
            key: "deepens",
            years: "1930-1932",
            startYear: 1930,
            endYear: 1932,
            label: "1930-1932: Depression Deepens",
            duration: 120,
            visual: "hooverville",
            factIds: ["unemployment-rises", "breadlines", "hoovervilles", "bank-failures"],
            narratives: [
                { time: 12, text: "Unemployment rises sharply.", factIds: ["unemployment-rises"] },
                { time: 34, text: "Many families wait in breadlines.", factIds: ["breadlines"] },
                { time: 58, text: "Temporary shelters appear after people lose homes.", factIds: ["hoovervilles"] },
                { time: 82, text: "Local charity cannot meet the scale of the crisis.", factIds: ["breadlines"] },
                { time: 104, text: "Bank failures wipe out savings in many communities.", factIds: ["bank-failures"] }
            ],
            choices: ["relief-1932"],
            obstacles: [
                { label: "Eviction Notice", effect: { money: -7, hope: -4 }, factIds: ["hoovervilles"] },
                { label: "Closed Factory", effect: { money: -6, food: -3 }, factIds: ["unemployment-rises"] },
                { label: "No Hiring", effect: { hope: -6 }, factIds: ["unemployment-rises"] },
                { label: "Bank Failure", effect: { money: -8, hope: -3 }, factIds: ["bank-failures"] },
                { label: "Breadline", effect: { food: -3, hope: -2 }, factIds: ["breadlines"] }
            ],
            collectibles: [
                { label: "Soup Bowl", effect: { food: 8 }, factIds: ["breadlines"] },
                { label: "Work Notice", effect: { money: 4, hope: 4 }, factIds: ["unemployment-rises"] },
                { label: "Bread", effect: { food: 8 }, factIds: ["breadlines"] },
                { label: "Coins", effect: { money: 6 } }
            ],
            props: ["Closed Factory", "Breadline", "Hooverville"]
        },
        {
            key: "first-new-deal",
            years: "1933",
            startYear: 1933,
            endYear: 1933,
            label: "1933: New Deal Begins",
            duration: 100,
            visual: "radio",
            factIds: ["fdr-elected-1932", "first-hundred-days", "emergency-banking-act", "bank-holiday", "fireside-chats", "fdic"],
            narratives: [
                { time: 4, text: "Franklin D. Roosevelt begins the New Deal.", factIds: ["fdr-elected-1932", "first-hundred-days"] },
                { time: 22, text: "The Bank Holiday pauses banks for inspection.", factIds: ["bank-holiday"] },
                { time: 42, text: "The Emergency Banking Act tries to restore trust.", factIds: ["emergency-banking-act"] },
                { time: 64, text: "Fireside Chats explain government action by radio.", factIds: ["fireside-chats"] },
                { time: 82, text: "The FDIC helps protect bank deposits.", factIds: ["fdic"] }
            ],
            choices: ["bank-reform-1933"],
            obstacles: [
                { label: "Bank Fear", effect: { hope: -6 }, factIds: ["bank-failures"] },
                { label: "Uncertainty", effect: { hope: -4, money: -2 }, factIds: ["first-hundred-days"] },
                { label: "Political Opposition", effect: { hope: -4 }, factIds: ["new-deal-opposition"] }
            ],
            collectibles: [
                { label: "Bank Holiday Notice", effect: { hope: 5 }, factIds: ["bank-holiday"] },
                { label: "FDIC Confidence", effect: { hope: 8 }, factIds: ["fdic"] },
                { label: "Relief Application", effect: { food: 6, hope: 3 }, factIds: ["first-hundred-days"] },
                { label: "Coins", effect: { money: 6 } }
            ],
            props: ["Radio", "Reopened Bank", "Notice Board"]
        },
        {
            key: "work-relief",
            years: "1933-1935",
            startYear: 1933,
            endYear: 1935,
            label: "1933-1935: Relief and Work Programs",
            duration: 135,
            visual: "public-works",
            factIds: ["ccc", "cwa", "pwa", "wpa", "tva", "aaa"],
            narratives: [
                { time: 10, text: "The CCC hires young men for conservation work.", factIds: ["ccc"] },
                { time: 32, text: "The CWA creates short-term emergency jobs.", factIds: ["cwa"] },
                { time: 54, text: "The PWA funds large bridges, schools, and public buildings.", factIds: ["pwa"] },
                { time: 78, text: "The TVA brings jobs, electricity, and flood control.", factIds: ["tva"] },
                { time: 102, text: "The WPA creates jobs building roads, parks, and public buildings.", factIds: ["wpa"] },
                { time: 122, text: "The AAA tries to raise farm prices, but its effects are uneven.", factIds: ["aaa"] }
            ],
            choices: ["wpa-job-1935"],
            obstacles: [
                { label: "Unemployment", effect: { money: -5, hope: -4 }, factIds: ["unemployment-rises"] },
                { label: "Low Wages", effect: { money: -5 }, factIds: ["wpa"] },
                { label: "Slow Recovery", effect: { hope: -5 }, factIds: ["new-deal-opposition"] },
                { label: "Critics of New Deal", effect: { hope: -4 }, factIds: ["new-deal-opposition"] }
            ],
            collectibles: [
                { label: "CCC Job Card", effect: { money: 7, hope: 7 }, factIds: ["ccc"] },
                { label: "CWA Work Crew", effect: { money: 6, food: 4 }, factIds: ["cwa"] },
                { label: "PWA Project", effect: { money: 6, hope: 5 }, factIds: ["pwa"] },
                { label: "WPA Paycheck", effect: { money: 8, food: 6, hope: 8 }, factIds: ["wpa"] },
                { label: "TVA Power", effect: { hope: 9 }, factIds: ["tva"] },
                { label: "AAA Aid Notice", effect: { money: 5, hope: 3 }, factIds: ["aaa"] }
            ],
            props: ["CCC Camp", "WPA Crew", "TVA Lines"]
        },
        {
            key: "reform-debate",
            years: "1935-1937",
            startYear: 1935,
            endYear: 1937,
            label: "1935-1937: Reform and Debate",
            duration: 95,
            visual: "capitol",
            factIds: ["social-security-act", "wagner-act", "new-deal-opposition", "court-packing"],
            narratives: [
                { time: 8, text: "Social Security creates a federal safety net for older Americans.", factIds: ["social-security-act"] },
                { time: 30, text: "The Wagner Act protects workers' rights to organize.", factIds: ["wagner-act"] },
                { time: 52, text: "New Deal critics debate federal power, costs, and recovery.", factIds: ["new-deal-opposition"] },
                { time: 74, text: "The court-packing controversy raises constitutional concerns.", factIds: ["court-packing"] }
            ],
            choices: ["union-1935"],
            obstacles: [
                { label: "Court Challenge", effect: { hope: -5 }, factIds: ["court-packing"] },
                { label: "Employer Pressure", effect: { money: -4, hope: -3 }, factIds: ["wagner-act"] },
                { label: "Political Opposition", effect: { hope: -4 }, factIds: ["new-deal-opposition"] }
            ],
            collectibles: [
                { label: "Social Security Card", effect: { hope: 9 }, factIds: ["social-security-act"] },
                { label: "Wagner Act Notice", effect: { hope: 8 }, factIds: ["wagner-act"] },
                { label: "Worker Voice", effect: { hope: 6, money: 3 }, factIds: ["wagner-act"] },
                { label: "Relief Check", effect: { money: 6, food: 4 }, factIds: ["social-security-act"] }
            ],
            props: ["Safety Net", "Union Hall", "Court"]
        },
        {
            key: "migration",
            years: "1934-1938",
            startYear: 1934,
            endYear: 1938,
            label: "1934-1938: Land, Debt, and Migration",
            duration: 110,
            visual: "dry-farm",
            factIds: ["farm-foreclosures", "dry-dust-bowl-conditions", "migration-west", "aaa"],
            narratives: [
                { time: 8, text: "The land dries and crops fail.", factIds: ["dry-dust-bowl-conditions"] },
                { time: 30, text: "Farm families face debt and foreclosure.", factIds: ["farm-foreclosures"] },
                { time: 52, text: "Some families leave home in search of work.", factIds: ["migration-west"] },
                { time: 84, text: "Migration can mean survival, but also hardship.", factIds: ["migration-west"] }
            ],
            choices: ["migration-west-1936", "farm-aid-1937"],
            obstacles: [
                { label: "Dust Cloud", effect: { food: -5, hope: -3 }, factIds: ["dry-dust-bowl-conditions"] },
                { label: "Failed Crop", effect: { food: -7 }, factIds: ["dry-dust-bowl-conditions"] },
                { label: "Farm Auction", effect: { money: -6, hope: -4 }, factIds: ["farm-foreclosures"] },
                { label: "Mortgage Due", effect: { money: -7 }, factIds: ["farm-foreclosures"] },
                { label: "Crowded Camp", effect: { hope: -5 }, factIds: ["migration-west"] }
            ],
            collectibles: [
                { label: "Water Can", effect: { food: 7, hope: 3 }, factIds: ["dry-dust-bowl-conditions"] },
                { label: "Map West", effect: { hope: 7 }, factIds: ["migration-west"] },
                { label: "Work Flyer", effect: { money: 5, hope: 4 }, factIds: ["migration-west"] },
                { label: "Bread", effect: { food: 8 } }
            ],
            props: ["Cracked Soil", "Packed Truck", "Road West"]
        },
        {
            key: "war-abroad",
            years: "1939-1940",
            startYear: 1939,
            endYear: 1940,
            label: "1939-1940: War Abroad, Caution at Home",
            duration: 95,
            visual: "news",
            factIds: ["neutrality-acts", "germany-invades-poland", "britain-france-declare-war", "isolationism-debate", "cash-and-carry"],
            narratives: [
                { time: 6, text: "1939: War begins in Europe.", factIds: ["germany-invades-poland"] },
                { time: 28, text: "The United States does not immediately enter the war.", factIds: ["neutrality-acts"] },
                { time: 50, text: "Neutrality and aid debates grow louder.", factIds: ["isolationism-debate"] },
                { time: 72, text: "Cash-and-carry expands aid while preserving distance.", factIds: ["cash-and-carry"] }
            ],
            news: [
                { time: 12, text: "News from Europe: Nazi Germany invades Poland.", factIds: ["germany-invades-poland"] },
                { time: 32, text: "Britain and France declare war.", factIds: ["britain-france-declare-war"] },
                { time: 54, text: "The U.S. debates neutrality.", factIds: ["neutrality-acts", "isolationism-debate"] },
                { time: 76, text: "Defense orders begin to grow.", factIds: ["cash-and-carry"] }
            ],
            choices: ["neutrality-1940"],
            obstacles: [
                { label: "War Headline", effect: { hope: -4 }, factIds: ["germany-invades-poland"] },
                { label: "Isolationist Pressure", effect: { readiness: -4, hope: -2 }, factIds: ["isolationism-debate"] },
                { label: "Fear of War", effect: { hope: -5 }, factIds: ["neutrality-acts"] },
                { label: "Uncertainty", effect: { money: -3, hope: -3 }, factIds: ["isolationism-debate"] }
            ],
            collectibles: [
                { label: "Newspaper", effect: { hope: 3 }, factIds: ["germany-invades-poland"] },
                { label: "Radio Bulletin", effect: { hope: 3 }, factIds: ["britain-france-declare-war"] },
                { label: "Defense Order", effect: { money: 6, readiness: 6 }, factIds: ["cash-and-carry"] },
                { label: "Factory Notice", effect: { money: 5, hope: 4 }, factIds: ["cash-and-carry"] }
            ],
            props: ["Radio Tower", "Newsstand", "Factory Notice"]
        },
        {
            key: "arsenal",
            years: "1940-1941",
            startYear: 1940,
            endYear: 1941,
            label: "1940-1941: Arsenal of Democracy",
            duration: 95,
            visual: "defense",
            factIds: ["arsenal-of-democracy", "lend-lease", "selective-training-service-act", "isolationism-debate"],
            narratives: [
                { time: 8, text: "Defense industries expand before formal U.S. entry.", factIds: ["arsenal-of-democracy"] },
                { time: 28, text: "Lend-Lease sends aid to nations fighting the Axis.", factIds: ["lend-lease"] },
                { time: 50, text: "Factory jobs begin pulling more Americans into paid work.", factIds: ["wartime-shipyard-factory-jobs"] },
                { time: 72, text: "The U.S. becomes the Arsenal of Democracy.", factIds: ["arsenal-of-democracy"] }
            ],
            news: [
                { time: 24, text: "Lend-Lease sends aid overseas.", factIds: ["lend-lease"] }
            ],
            choices: ["defense-work-1941"],
            obstacles: [
                { label: "Isolationism", effect: { readiness: -5 }, factIds: ["isolationism-debate"] },
                { label: "Supply Shortage", effect: { money: -4, readiness: -3 }, factIds: ["arsenal-of-democracy"] },
                { label: "Global Tension", effect: { hope: -5 }, factIds: ["lend-lease"] },
                { label: "Long Factory Hours", effect: { hope: -3, food: -2 }, factIds: ["wartime-shipyard-factory-jobs"] }
            ],
            collectibles: [
                { label: "Defense Job", effect: { money: 8, food: 4, readiness: 6 }, factIds: ["arsenal-of-democracy"] },
                { label: "Factory Paycheck", effect: { money: 8, food: 6 }, factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "Lend-Lease Crate", effect: { readiness: 10, hope: 3 }, factIds: ["lend-lease"] },
                { label: "Training Notice", effect: { readiness: 8 }, factIds: ["selective-training-service-act"] },
                { label: "War Bond", effect: { readiness: 7, hope: 4 }, factIds: ["war-bonds"] }
            ],
            props: ["Shipyard", "Assembly Line", "Defense Poster"]
        },
        {
            key: "pearl-harbor",
            years: "Dec. 1941",
            startYear: 1941,
            endYear: 1941,
            label: "December 1941: U.S. Enters World War II",
            duration: 60,
            visual: "alert",
            factIds: ["pearl-harbor", "us-declares-war"],
            narratives: [
                { time: 4, text: "December 7, 1941: Japan attacks Pearl Harbor.", factIds: ["pearl-harbor"] },
                { time: 24, text: "The United States declares war.", factIds: ["us-declares-war"] },
                { time: 44, text: "The story continues into wartime mobilization.", factIds: ["war-production-board"] }
            ],
            news: [
                { time: 8, text: "Radio Alert: Japan attacks Pearl Harbor.", factIds: ["pearl-harbor"] },
                { time: 30, text: "Congress declares war.", factIds: ["us-declares-war"] }
            ],
            choices: [],
            obstacles: [
                { label: "War Anxiety", effect: { hope: -6 }, factIds: ["pearl-harbor"] },
                { label: "Family Separation", effect: { hope: -5 }, factIds: ["us-declares-war"] },
                { label: "Mobilization Rush", effect: { food: -3, readiness: 2 }, factIds: ["us-declares-war"] }
            ],
            collectibles: [
                { label: "War Readiness", effect: { readiness: 10 }, factIds: ["us-declares-war"] },
                { label: "Factory Notice", effect: { money: 6, readiness: 5 }, factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "Radio Update", effect: { hope: 3 }, factIds: ["pearl-harbor"] }
            ],
            props: ["Radio Alert", "Congress", "Mobilization"]
        },
        {
            key: "mobilization",
            years: "1942-1944",
            startYear: 1942,
            endYear: 1944,
            label: "1942-1944: Wartime Mobilization",
            duration: 150,
            visual: "wartime",
            factIds: ["war-production-board", "office-price-administration", "rationing", "war-bonds", "rosie-women-industry", "african-american-industrial-migration", "japanese-american-incarceration", "wartime-shipyard-factory-jobs", "unemployment-falls-mobilization"],
            narratives: [
                { time: 8, text: "Wartime production creates millions of jobs.", factIds: ["wartime-shipyard-factory-jobs", "unemployment-falls-mobilization"] },
                { time: 26, text: "Factories shift from consumer goods to planes, ships, tanks, and weapons.", factIds: ["war-production-board"] },
                { time: 46, text: "Women enter industrial jobs in large numbers.", factIds: ["rosie-women-industry"] },
                { time: 66, text: "African Americans move to industrial jobs while facing discrimination.", factIds: ["african-american-industrial-migration"] },
                { time: 88, text: "Japanese American incarceration violates civil liberties.", factIds: ["japanese-american-incarceration"] },
                { time: 108, text: "Rationing limits goods so supplies can support the war effort.", factIds: ["rationing", "office-price-administration"] },
                { time: 128, text: "The Depression fades as wartime demand transforms the economy.", factIds: ["unemployment-falls-mobilization"] }
            ],
            news: [
                { time: 16, text: "Factories expand for wartime production.", factIds: ["war-production-board"] },
                { time: 58, text: "Millions find work in war industries.", factIds: ["wartime-shipyard-factory-jobs", "unemployment-falls-mobilization"] }
            ],
            choices: ["shipyard-1942", "war-bonds-1943", "rationing-1943"],
            obstacles: [
                { label: "Ration Limits", effect: { food: -5 }, factIds: ["rationing"] },
                { label: "Long Hours", effect: { hope: -4, food: -2 }, factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "Family Separation", effect: { hope: -5 }, factIds: ["us-declares-war"] },
                { label: "Housing Shortage", effect: { money: -5, hope: -3 }, factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "Discrimination", effect: { hope: -6 }, factIds: ["african-american-industrial-migration"] },
                { label: "Civil Liberties Crisis", effect: { hope: -6 }, factIds: ["japanese-american-incarceration"] },
                { label: "Labor Strain", effect: { food: -3, hope: -3 }, factIds: ["wartime-shipyard-factory-jobs"] }
            ],
            collectibles: [
                { label: "Factory Paycheck", effect: { money: 9, food: 5 }, factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "War Job", effect: { money: 9, hope: 6 }, factIds: ["unemployment-falls-mobilization"] },
                { label: "Rosie Poster", effect: { hope: 8 }, factIds: ["rosie-women-industry"] },
                { label: "War Bond", effect: { readiness: 9, hope: 4 }, factIds: ["war-bonds"] },
                { label: "Ration Book", effect: { food: 8, readiness: 6 }, factIds: ["rationing"] },
                { label: "Shipyard Job", effect: { money: 9, readiness: 5 }, factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "WPB Contract", effect: { money: 8, readiness: 8 }, factIds: ["war-production-board"] },
                { label: "OPA Price Control", effect: { food: 7, hope: 3 }, factIds: ["office-price-administration"] }
            ],
            props: ["Shipyard Jobs", "Ration Board", "War Bonds"]
        },
        {
            key: "war-ends",
            years: "1945",
            startYear: 1945,
            endYear: 1945,
            label: "1945: War Ends and Reflection",
            duration: 60,
            visual: "sunrise",
            factIds: ["wwii-ends-1945", "unemployment-falls-mobilization", "war-production-board", "wartime-shipyard-factory-jobs"],
            narratives: [
                { time: 4, text: "1945: World War II ends.", factIds: ["wwii-ends-1945"] },
                { time: 20, text: "Wartime production helped end mass unemployment.", factIds: ["unemployment-falls-mobilization"] },
                { time: 36, text: "Federal spending and industrial mobilization transformed the economy.", factIds: ["war-production-board"] },
                { time: 50, text: "The Depression years changed expectations of government.", factIds: ["first-hundred-days", "social-security-act"] }
            ],
            choices: [],
            obstacles: [
                { label: "War Cost", effect: { hope: -4 }, factIds: ["wwii-ends-1945"] },
                { label: "Unequal Opportunity", effect: { hope: -4 }, factIds: ["african-american-industrial-migration"] },
                { label: "Transition Home", effect: { money: -3, hope: -2 }, factIds: ["wwii-ends-1945"] }
            ],
            collectibles: [
                { label: "War Ends Headline", effect: { hope: 10 }, factIds: ["wwii-ends-1945"] },
                { label: "Factory Lights", effect: { money: 6, hope: 6 }, factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "Homecoming", effect: { hope: 8 }, factIds: ["wwii-ends-1945"] }
            ],
            props: ["War Ends", "Factory Lights", "Sunrise"]
        }
    ],
    choices: [
        {
            id: "savings-1929",
            stage: "crash",
            time: 50,
            prompt: "Your family has some savings left after the crash.",
            factIds: ["stock-crash-1929", "bank-failures"],
            options: [
                { label: "I want to keep savings in the bank", effect: { hope: 6 }, consequence: "You preserve confidence, but bank failures remain a risk.", factIds: ["bank-failures"] },
                { label: "I want to buy food and supplies", effect: { food: 12, money: -8 }, consequence: "The pantry is steadier, but cash is harder to replace.", factIds: ["breadlines"] }
            ]
        },
        {
            id: "relief-1932",
            stage: "deepens",
            time: 58,
            prompt: "You cannot find steady work.",
            factIds: ["unemployment-rises", "breadlines"],
            options: [
                { label: "I want to wait for private work", effect: { hope: 5, food: -8 }, consequence: "You keep searching, but hunger grows while jobs are scarce.", factIds: ["unemployment-rises"] },
                { label: "I want to seek emergency relief", effect: { food: 12, hope: -3 }, consequence: "Relief helps, but aid is limited and often stigmatized.", factIds: ["breadlines"] }
            ]
        },
        {
            id: "bank-reform-1933",
            stage: "first-new-deal",
            time: 46,
            prompt: "FDR announces banking reforms.",
            factIds: ["emergency-banking-act", "fdic"],
            options: [
                { label: "I want to trust the reopened banks", effect: { hope: 10, money: 5 }, consequence: "Bank reform and deposit insurance strengthen confidence.", factIds: ["bank-holiday", "fdic"] },
                { label: "I want to keep some cash close while banks are being tested", effect: { money: 4, hope: -3 }, consequence: "Cash feels practical after bank failures, but many families remain cautious about banks.", factIds: ["bank-failures"] }
            ]
        },
        {
            id: "wpa-job-1935",
            stage: "work-relief",
            time: 60,
            prompt: "A WPA job is available far from home.",
            factIds: ["wpa"],
            options: [
                { label: "I want to take the WPA job", effect: { money: 14, food: 8, hope: 10 }, consequence: "A public job brings wages, food, and dignity.", factIds: ["wpa"] },
                { label: "I want to keep searching independently", effect: { hope: 5, money: -7 }, consequence: "Independence matters, but steady pay remains uncertain.", factIds: ["unemployment-rises"] }
            ]
        },
        {
            id: "union-1935",
            stage: "reform-debate",
            time: 42,
            prompt: "A labor organizer asks workers to join together.",
            factIds: ["wagner-act"],
            options: [
                { label: "I want to support union organizing", effect: { hope: 10, money: 4 }, consequence: "Worker voice grows under the Wagner Act, though conflict may follow.", factIds: ["wagner-act"] },
                { label: "I want to avoid conflict with my employer", effect: { money: 5, hope: -6 }, consequence: "You reduce immediate risk but lose some collective power.", factIds: ["wagner-act"] }
            ]
        },
        {
            id: "migration-west-1936",
            stage: "migration",
            time: 38,
            prompt: "Your farm cannot support your family anymore.",
            factIds: ["dry-dust-bowl-conditions", "migration-west"],
            options: [
                { label: "I want to leave for the West", effect: { money: -8, hope: 10 }, consequence: "The road offers possibility, but travel and crowded camps are costly.", factIds: ["migration-west"] },
                { label: "I want to stay and try again", effect: { food: -10, hope: 5 }, consequence: "Home remains meaningful, but another failed crop hurts.", factIds: ["farm-foreclosures"] }
            ]
        },
        {
            id: "farm-aid-1937",
            stage: "migration",
            time: 82,
            prompt: "A government farm program offers aid.",
            factIds: ["aaa"],
            options: [
                { label: "I want to accept agricultural support", effect: { money: 8, hope: 7 }, consequence: "Aid helps some farmers, though benefits are uneven.", factIds: ["aaa"] },
                { label: "I want to refuse and remain independent", effect: { hope: 5, food: -7, money: -4 }, consequence: "You keep independence, but the farm remains under pressure.", factIds: ["farm-foreclosures"] }
            ]
        },
        {
            id: "neutrality-1940",
            stage: "war-abroad",
            time: 50,
            prompt: "War spreads in Europe.",
            factIds: ["neutrality-acts", "isolationism-debate"],
            options: [
                { label: "I want to support strict neutrality", effect: { hope: 6, readiness: -8 }, consequence: "Many Americans share this caution after World War I.", factIds: ["neutrality-acts", "isolationism-debate"] },
                { label: "I want to support defense preparation", effect: { money: 8, readiness: 12, hope: -2 }, consequence: "Defense orders create work, but fear of war grows.", factIds: ["cash-and-carry", "arsenal-of-democracy"] }
            ]
        },
        {
            id: "defense-work-1941",
            stage: "arsenal",
            time: 44,
            prompt: "A defense factory is hiring.",
            factIds: ["arsenal-of-democracy", "wartime-shipyard-factory-jobs"],
            options: [
                { label: "I want to take the factory job", effect: { money: 14, food: 8, readiness: 10, hope: -3 }, consequence: "The wages help, but long hours and tension weigh on the family.", factIds: ["arsenal-of-democracy"] },
                { label: "I want to keep looking for nonwar work nearby", effect: { hope: 5, money: -5, readiness: -6 }, consequence: "You protect personal beliefs, but miss some of the growing defense economy.", factIds: ["isolationism-debate"] }
            ]
        },
        {
            id: "shipyard-1942",
            stage: "mobilization",
            time: 28,
            prompt: "A shipyard job opens in a crowded city.",
            factIds: ["wartime-shipyard-factory-jobs", "unemployment-falls-mobilization"],
            options: [
                { label: "I want to move for war work", effect: { money: 14, food: 8, readiness: 8, hope: -3 }, consequence: "War work brings pay, but housing stress follows migrants.", factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "I want to stay home", effect: { hope: 5, money: -8 }, consequence: "Staying protects routine, but the biggest job growth is elsewhere.", factIds: ["unemployment-falls-mobilization"] }
            ]
        },
        {
            id: "war-bonds-1943",
            stage: "mobilization",
            time: 72,
            prompt: "The government asks families to buy war bonds.",
            factIds: ["war-bonds"],
            options: [
                { label: "I want to buy war bonds", effect: { money: -8, readiness: 12, hope: 7 }, consequence: "You sacrifice money now to support federal war spending.", factIds: ["war-bonds"] },
                { label: "I want to save every dollar", effect: { money: 8, readiness: -7 }, consequence: "Savings stay close, but the war effort receives less support.", factIds: ["war-bonds"] }
            ]
        },
        {
            id: "rationing-1943",
            stage: "mobilization",
            time: 112,
            prompt: "Rationing begins.",
            factIds: ["rationing", "office-price-administration"],
            options: [
                { label: "I want to follow ration rules", effect: { readiness: 10, food: 7 }, consequence: "Rationing stretches supplies and supports the war effort.", factIds: ["rationing", "office-price-administration"] },
                { label: "I want to stretch supplies through local swaps", effect: { food: 6, hope: -2, readiness: -5 }, consequence: "Families improvise under pressure, but ration systems depend on shared rules.", factIds: ["rationing"] }
            ]
        }
    ]
};

function miniGameVariant(id, mode, prompt){
    const text = `${id} ${mode} ${prompt}`;
    if(/Match|Safety Net|FDIC|Lend-Lease|policy|agency/i.test(text)) return "match";
    if(/News|Radio|Pearl|War Ends|sequence|Reflection|Final/i.test(text)) return "timeline";
    if(/Bond|Ration|Readiness|Job|Work|Factory|Tradeoff|Shelter|Debt|Savings/i.test(text)) return "balance";
    if(/Civil Liberties|Migration|Hooverville|Farm|Court|Worker/i.test(text)) return "map";
    return "evidence";
}

function miniGameChips(variant){
    if(variant == "match") return ["Policy", "Purpose", "Who it helped", "Consequence"];
    if(variant == "timeline") return ["Cause", "Event", "Immediate result", "Long-term effect"];
    if(variant == "balance") return ["Money", "Food", "Hope", "War readiness"];
    if(variant == "map") return ["Family", "Government", "Workplace", "Community"];
    return ["Cause", "Evidence", "Tradeoff", "Consequence"];
}

function eventIcon(label, factIds = []){
    const text = `${label} ${factIds.join(" ")}`;
    if(/bank|fdic|holiday|savings/i.test(text)) return "bank";
    if(/bread|relief|food|ration|opa/i.test(text)) return "bread";
    if(/farm|dry|migration|foreclosure|dust/i.test(text)) return "truck";
    if(/radio|fireside|news|pearl|poland|war|lend|congress/i.test(text)) return "radio";
    if(/factory|wpa|ccc|cwa|pwa|tva|work|job|wpb|shipyard|rosie/i.test(text)) return "factory";
    if(/court|wagner|social|security|civil|incarceration/i.test(text)) return "document";
    if(/bond|money|crash|margin|stock/i.test(text)) return "coins";
    return "document";
}

function historicalImageFor(factIds = [], prompt = ""){
    const text = `${factIds.join(" ")} ${prompt}`;
    if(/stock-crash|buying-on-margin|crash|margin|stock|market crashes/i.test(text)) return HISTORICAL_IMAGES.crash;
    if(/pearl-harbor|declares-war|Pearl Harbor/i.test(text)) return HISTORICAL_IMAGES.pearlHarbor;
    if(/wwii-ends|war ends|1945|Final Balance|Historical Reflection/i.test(text)) return HISTORICAL_IMAGES.warEnds;
    if(/japanese-american-incarceration|civil liberties|incarceration/i.test(text)) return HISTORICAL_IMAGES.incarceration;
    if(/rationing|office-price-administration|OPA|ration/i.test(text)) return HISTORICAL_IMAGES.rationing;
    if(/rosie|women|war-production-board|shipyard|factory|wartime-shipyard|unemployment-falls|mobilization|war bonds|bond/i.test(text)) return HISTORICAL_IMAGES.rosie;
    if(/lend-lease|arsenal-of-democracy|selective-training|defense|readiness/i.test(text)) return HISTORICAL_IMAGES.lendLease;
    if(/germany-invades-poland|britain-france|neutrality|cash-and-carry|isolationism|Europe/i.test(text)) return HISTORICAL_IMAGES.europeWar;
    if(/migration-west|Migrant|West/i.test(text)) return HISTORICAL_IMAGES.migration;
    if(/dry-dust-bowl|farm-foreclosures|aaa|farm|crop|auction|Dust/i.test(text)) return HISTORICAL_IMAGES.dust;
    if(/social-security|wagner-act|court-packing|new-deal-opposition|Worker Voice|Safety Net/i.test(text)) return HISTORICAL_IMAGES.socialSecurity;
    if(/wpa|pwa|tva|cwa|public works|work program/i.test(text)) return HISTORICAL_IMAGES.wpa;
    if(/ccc|conservation/i.test(text)) return HISTORICAL_IMAGES.ccc;
    if(/fdr-elected|first-hundred-days|fireside|Franklin D. Roosevelt|FDR/i.test(text)) return HISTORICAL_IMAGES.fdr;
    if(/hoovervilles|shelter|eviction/i.test(text)) return HISTORICAL_IMAGES.hooverville;
    if(/breadlines|unemployment-rises|relief|food|Bread/i.test(text)) return HISTORICAL_IMAGES.breadline;
    if(/bank-failures|fdic|bank-holiday|emergency-banking|bank|deposit/i.test(text)) return HISTORICAL_IMAGES.bank;
    return HISTORICAL_IMAGES.crash;
}

function eventLane(event){
    const text = `${event.label} ${(event.factIds || []).join(" ")}`;
    if(/radio|headline|pearl|poland|war ends|congress|fireside|news/i.test(text)) return "slide";
    if(/bread|bank|factory|job|farm|wpa|ccc|pwa|tva|wpb|ration|bond/i.test(text)) return "jump";
    const hash = Array.from(event.label).reduce((sum, char)=> sum + char.charCodeAt(0), 0);
    return hash % 2 ? "slide" : "jump";
}

function miniGame(id, mode, prompt, instructions, factIds, options){
    const variant = miniGameVariant(id, mode, prompt);
    return {
        id,
        mode,
        prompt,
        instructions,
        factIds,
        options,
        variant,
        visual: eventIcon(prompt, factIds),
        image: historicalImageFor(factIds, prompt),
        chips: miniGameChips(variant)
    };
}

function yearEvent(time, label, description, factIds, game){
    return { time, label, description, factIds, miniGame: game, icon: eventIcon(label, factIds) };
}

function annualStage(year, label, visual, props, events, collectibles = []){
    const factSet = new Set();
    for(let event of events){
        for(let factId of event.factIds || []) factSet.add(factId);
        if(event.miniGame){
            for(let factId of event.miniGame.factIds || []) factSet.add(factId);
            for(let option of event.miniGame.options || []){
                for(let factId of option.factIds || []) factSet.add(factId);
            }
        }
    }
    return {
        key: `year-${year}`,
        years: `${year}`,
        startYear: year,
        endYear: year,
        label: `${year}: ${label}`,
        duration: YEAR_DURATION_SECONDS,
        visual,
        factIds: Array.from(factSet),
        narratives: events.map((event)=> ({
            time: Math.max(1, event.time - 0.8),
            text: `${year}: ${event.description}`,
            factIds: event.factIds
        })),
        news: events
            .filter((event)=> event.label.includes("FDR Elected") || event.label.includes("Poland") || event.label.includes("Pearl Harbor") || event.label.includes("War Ends"))
            .map((event)=> ({
                time: event.time,
                text: event.label.includes("FDR Elected")
                    ? "Emergency Announcement: Franklin D. Roosevelt wins the 1932 election."
                    : event.label.includes("Pearl Harbor")
                        ? "Emergency Announcement: Japan attacks Pearl Harbor."
                        : event.label.includes("Poland")
                            ? "Emergency Announcement: Nazi Germany invades Poland."
                            : "Emergency Announcement: World War II ends in 1945.",
                factIds: event.factIds
            })),
        choices: [],
        obstacles: [],
        collectibles,
        props,
        events
    };
}

const YEARLY_STAGES = [
    annualStage(1929, "Crash and Panic", "city", ["Stock Ticker", "Bank", "Headline"], [
        yearEvent(3, "Stock Market Crash", "Stock prices collapse after a speculative boom.", ["stock-crash-1929"], miniGame(
            "mg-1929-crash",
            "Mini-Game: Crash Response",
            "The market crashes and confidence breaks.",
            "Choose which risk feels more manageable.",
            ["stock-crash-1929"],
            [
                { label: "I want to sell what we can and buy food", effect: { food: 8, money: -4 }, consequence: "Food security rises, but cash gets tighter.", factIds: ["stock-crash-1929"] },
                { label: "I want to hold our shares and avoid panic-selling", effect: { money: -3, hope: 5 }, consequence: "You preserve hope for a rebound, but falling prices still hurt.", factIds: ["stock-crash-1929", "buying-on-margin"] }
            ]
        )),
        yearEvent(8, "Buying on Margin", "Buying with borrowed money turns falling prices into deeper losses.", ["buying-on-margin"], miniGame(
            "mg-1929-margin",
            "Mini-Game: Borrowed Risk",
            "A neighbor says stocks will bounce back if everyone borrows more.",
            "Choose how much risk your family can carry.",
            ["buying-on-margin"],
            [
                { label: "I want to reduce debt before losses grow", effect: { money: -2, hope: 6 }, consequence: "Less borrowed money lowers risk, though selling can lock in losses.", factIds: ["buying-on-margin"] },
                { label: "I want to borrow a little and bet on a rebound", effect: { money: -6, hope: 4 }, consequence: "The rebound hope is real, but margin debt makes the fall more dangerous.", factIds: ["buying-on-margin"] }
            ]
        ))
    ], [
        { label: "Coins", effect: { money: 6 } },
        { label: "Bread", effect: { food: 8 } },
        { label: "Newspaper", effect: { hope: 3 }, factIds: ["stock-crash-1929"] }
    ]),
    annualStage(1930, "Banks and Breadlines", "hooverville", ["Closed Bank", "Breadline", "Empty Store"], [
        yearEvent(4, "Bank Failures", "Bank failures spread fear and erase savings.", ["bank-failures"], miniGame(
            "mg-1930-bank",
            "Mini-Game: Savings Choice",
            "A local bank looks shaky.",
            "Choose a tradeoff for your family's savings.",
            ["bank-failures"],
            [
                { label: "I want to keep some cash for essentials", effect: { food: 6, money: -2 }, consequence: "You protect daily needs but have less cash.", factIds: ["bank-failures"] },
                { label: "I want to leave all our savings in the bank", effect: { hope: 4, money: -6 }, consequence: "Confidence helps, but failures can still wipe out deposits.", factIds: ["bank-failures"] }
            ]
        )),
        yearEvent(9, "Breadlines", "Many families rely on breadlines and local relief.", ["breadlines"], miniGame(
            "mg-1930-breadline",
            "Mini-Game: Relief Line",
            "The breadline is long and work is scarce.",
            "Choose how to balance survival, pride, and uncertainty.",
            ["breadlines"],
            [
                { label: "I want to accept relief and keep looking for work", effect: { food: 10, hope: 2 }, consequence: "Relief helps survival while work remains uncertain.", factIds: ["breadlines", "unemployment-rises"] },
                { label: "I want to rely on neighbors and odd jobs first", effect: { food: -3, hope: 5 }, consequence: "Community and independence matter, but local help is stretched thin.", factIds: ["breadlines"] }
            ]
        ))
    ], [
        { label: "Soup Bowl", effect: { food: 8 }, factIds: ["breadlines"] },
        { label: "Bread", effect: { food: 8 }, factIds: ["breadlines"] },
        { label: "Coins", effect: { money: 6 } }
    ]),
    annualStage(1931, "Unemployment and Hoovervilles", "hooverville", ["No Hiring", "Shelter", "Factory Gate"], [
        yearEvent(4, "Unemployment Rises", "Factories close and unemployment climbs.", ["unemployment-rises"], miniGame(
            "mg-1931-work",
            "Mini-Game: Job Search",
            "No steady work is available nearby.",
            "Choose how to spend limited time and food.",
            ["unemployment-rises"],
            [
                { label: "I will search every day and ration meals", effect: { hope: 5, food: -4 }, consequence: "Hope stays alive, but meals shrink.", factIds: ["unemployment-rises"] },
                { label: "I will conserve energy and wait for a real opening", effect: { food: 2, hope: -3 }, consequence: "You protect strength, but waiting can deepen discouragement.", factIds: ["unemployment-rises"] }
            ]
        )),
        yearEvent(9, "Hoovervilles", "Temporary shelters appear as families lose homes.", ["hoovervilles"], miniGame(
            "mg-1931-hooverville",
            "Mini-Game: Shelter Tradeoff",
            "Rent is due and cash is nearly gone.",
            "Choose the least damaging option.",
            ["hoovervilles"],
            [
                { label: "I want to share shelter with relatives", effect: { money: 4, hope: 2 }, consequence: "Crowding is hard, but support networks matter.", factIds: ["hoovervilles"] },
                { label: "I want to spend all our savings on rent", effect: { money: -10, hope: 4 }, consequence: "Housing lasts a little longer, but savings vanish.", factIds: ["hoovervilles"] }
            ]
        ))
    ], [
        { label: "Work Notice", effect: { money: 4, hope: 4 }, factIds: ["unemployment-rises"] },
        { label: "Soup Bowl", effect: { food: 8 }, factIds: ["breadlines"] }
    ]),
    annualStage(1932, "Election and Demands for Action", "radio", ["Campaign Radio", "Relief Office", "Ballot"], [
        yearEvent(4, "FDR Elected", "Franklin D. Roosevelt wins the 1932 election promising a New Deal.", ["fdr-elected-1932"], miniGame(
            "mg-1932-election",
            "Mini-Game: Read the Promise",
            "Voters hear promises of relief, recovery, and reform.",
            "Choose which argument feels most convincing in 1932.",
            ["fdr-elected-1932"],
            [
                { label: "I want the federal government to do more", effect: { hope: 8 }, consequence: "The election signals demand for stronger federal response.", factIds: ["fdr-elected-1932"] },
                { label: "I want local aid and private business to lead recovery", effect: { money: 2, hope: -2 }, consequence: "Many Americans valued local action, but the crisis has outgrown it.", factIds: ["fdr-elected-1932", "breadlines"] }
            ]
        )),
        yearEvent(9, "Emergency Relief Pressure", "Private charity cannot meet the scale of the crisis.", ["breadlines", "unemployment-rises"], miniGame(
            "mg-1932-relief",
            "Mini-Game: Relief Request",
            "Your family needs food before steady work returns.",
            "Choose which help you are willing to seek.",
            ["breadlines"],
            [
                { label: "I want to ask for emergency relief", effect: { food: 10, hope: -2 }, consequence: "Relief helps, though stigma and limits remain.", factIds: ["breadlines"] },
                { label: "I want to try private charity and day labor first", effect: { food: -3, hope: 4 }, consequence: "That protects pride and independence, but aid remains uncertain.", factIds: ["breadlines", "unemployment-rises"] }
            ]
        ))
    ], [
        { label: "Relief Application", effect: { food: 6, hope: 3 }, factIds: ["breadlines"] },
        { label: "Bread", effect: { food: 8 } }
    ]),
    annualStage(1933, "First Hundred Days", "radio", ["Radio", "Reopened Bank", "CCC Camp"], [
        yearEvent(3, "Bank Holiday", "The Bank Holiday closes banks for inspection.", ["bank-holiday", "emergency-banking-act"], miniGame(
            "mg-1933-bank-holiday",
            "Mini-Game: Restore Confidence",
            "A reopened bank asks people to trust the system again.",
            "Choose a response to banking reform.",
            ["bank-holiday", "emergency-banking-act"],
            [
                { label: "I want to use the reopened inspected banks", effect: { hope: 9, money: 4 }, consequence: "Banking reform helps rebuild public faith in banks.", factIds: ["emergency-banking-act", "bank-holiday"] },
                { label: "I want to keep some cash close while banks are being tested", effect: { money: 3, hope: -2 }, consequence: "Caution feels practical after failures, though many families remain wary of banks.", factIds: ["bank-failures", "bank-holiday"] }
            ]
        )),
        yearEvent(7, "Fireside Chats and FDIC", "Radio messages explain reform and FDIC protects deposits.", ["fireside-chats", "fdic"], miniGame(
            "mg-1933-fdic",
            "Mini-Game: Trust the Bank?",
            "A Fireside Chat explains deposit insurance.",
            "Choose how quickly to trust the new protection.",
            ["fdic"],
            [
                { label: "I want to deposit a little after hearing about the FDIC", effect: { hope: 8, money: 2 }, consequence: "Deposit insurance helps restore trust without erasing every fear.", factIds: ["fdic", "fireside-chats"] },
                { label: "I want to wait and see what neighbors do", effect: { money: 2, hope: -2 }, consequence: "Caution is understandable after failures, but inspected banks need depositors to use them again.", factIds: ["fdic", "bank-failures"] }
            ]
        )),
        yearEvent(11, "CCC, PWA, TVA, AAA", "The New Deal experiments with jobs, public works, power, and farm policy.", ["ccc", "pwa", "tva", "aaa", "first-hundred-days"], miniGame(
            "mg-1933-programs",
            "Mini-Game: Pick a Work Program",
            "Your family needs income and public work is opening.",
            "Choose which sacrifice your family can manage.",
            ["ccc", "pwa", "tva"],
            [
                { label: "I want to take a CCC conservation job away from home", effect: { money: 8, hope: 5 }, consequence: "The CCC brings wages and purpose, though separation is hard.", factIds: ["ccc"] },
                { label: "I want to stay near family and search locally", effect: { hope: 3, money: -4 }, consequence: "Staying protects family ties, but local work remains scarce.", factIds: ["unemployment-rises"] }
            ]
        ))
    ], [
        { label: "FDIC Confidence", effect: { hope: 8 }, factIds: ["fdic"] },
        { label: "CCC Job Card", effect: { money: 7, hope: 7 }, factIds: ["ccc"] }
    ]),
    annualStage(1934, "Work Relief and Dry Land", "dry-farm", ["Work Crew", "Cracked Soil", "Farm Debt"], [
        yearEvent(4, "CWA Work Relief", "The Civil Works Administration provides short-term jobs.", ["cwa"], miniGame(
            "mg-1934-cwa",
            "Mini-Game: Short-Term Work",
            "A short-term CWA job opens.",
            "Choose how to use the temporary paycheck.",
            ["cwa"],
            [
                { label: "I want to buy food and save a little", effect: { food: 8, money: 4 }, consequence: "Short-term work offers relief, not a permanent fix.", factIds: ["cwa"] },
                { label: "I want to pay old debts before they grow", effect: { money: 2, hope: 4, food: -2 }, consequence: "Debt pressure eases, but the pantry gets thinner.", factIds: ["cwa", "farm-foreclosures"] }
            ]
        )),
        yearEvent(9, "Dry Farm Conditions", "Dry land and debt make farming harder.", ["dry-dust-bowl-conditions", "farm-foreclosures"], miniGame(
            "mg-1934-farm",
            "Mini-Game: Farm Debt",
            "A crop fails and the mortgage is due.",
            "Choose a difficult farm-family tradeoff.",
            ["dry-dust-bowl-conditions", "farm-foreclosures"],
            [
                { label: "I want to seek farm aid and ration food", effect: { money: 5, food: -3, hope: 4 }, consequence: "Aid helps, but the land is still under stress.", factIds: ["aaa", "farm-foreclosures"] },
                { label: "I want to stay independent and renegotiate locally", effect: { hope: 5, money: -4, food: -2 }, consequence: "Independence matters, but foreclosure pressure remains.", factIds: ["farm-foreclosures"] }
            ]
        ))
    ], [
        { label: "Water Can", effect: { food: 7, hope: 3 }, factIds: ["dry-dust-bowl-conditions"] },
        { label: "CWA Work Crew", effect: { money: 6, food: 4 }, factIds: ["cwa"] }
    ]),
    annualStage(1935, "Second New Deal", "public-works", ["WPA Crew", "Safety Net", "Union Hall"], [
        yearEvent(3, "WPA Jobs", "The Works Progress Administration creates public jobs.", ["wpa"], miniGame(
            "mg-1935-wpa",
            "Mini-Game: Build the Community",
            "A WPA project is hiring.",
            "Choose how to weigh public work and independence.",
            ["wpa"],
            [
                { label: "I want to build roads, schools, and parks", effect: { money: 12, food: 6, hope: 8 }, consequence: "WPA work brings wages and useful public projects.", factIds: ["wpa"] },
                { label: "I want to keep searching for private work", effect: { hope: 4, money: -5 }, consequence: "Private work feels more independent, but jobs remain scarce.", factIds: ["new-deal-opposition", "unemployment-rises"] }
            ]
        )),
        yearEvent(7, "Social Security Act", "The Social Security Act creates a federal safety net.", ["social-security-act"], miniGame(
            "mg-1935-social-security",
            "Mini-Game: Safety Net Debate",
            "Older Americans need long-term support.",
            "Choose which concern matters more to you.",
            ["social-security-act"],
            [
                { label: "I want a federal safety net for old age", effect: { hope: 10 }, consequence: "Social Security changes expectations of federal responsibility.", factIds: ["social-security-act"] },
                { label: "I worry payroll taxes hurt workers right now", effect: { money: 3, hope: -2 }, consequence: "Immediate costs worry critics, even as long-term protection grows.", factIds: ["social-security-act", "new-deal-opposition"] }
            ]
        )),
        yearEvent(11, "Wagner Act", "The Wagner Act protects workers' rights to organize.", ["wagner-act"], miniGame(
            "mg-1935-wagner",
            "Mini-Game: Worker Voice",
            "Workers discuss organizing for better conditions.",
            "Choose how to respond.",
            ["wagner-act"],
            [
                { label: "I want to support worker organizing", effect: { hope: 8, money: 3 }, consequence: "Worker voice grows under the Wagner Act.", factIds: ["wagner-act"] },
                { label: "I want to avoid risking the job I already have", effect: { money: 4, hope: -3 }, consequence: "Short-term security matters, but worker power may stay limited.", factIds: ["wagner-act"] }
            ]
        ))
    ], [
        { label: "WPA Paycheck", effect: { money: 8, food: 6, hope: 8 }, factIds: ["wpa"] },
        { label: "Social Security Card", effect: { hope: 9 }, factIds: ["social-security-act"] }
    ]),
    annualStage(1936, "Migration West", "dry-farm", ["Packed Truck", "Road West", "Crowded Camp"], [
        yearEvent(5, "Migration West", "Many farm families leave home searching for work.", ["migration-west", "dry-dust-bowl-conditions"], miniGame(
            "mg-1936-migration",
            "Mini-Game: Stay or Move",
            "The farm can no longer support your family.",
            "Choose a path with no perfect answer.",
            ["migration-west"],
            [
                { label: "I want to leave for the West", effect: { money: -6, hope: 9 }, consequence: "Migration offers hope but brings travel costs and crowded camps.", factIds: ["migration-west"] },
                { label: "I want to stay and try again", effect: { food: -8, hope: 4 }, consequence: "Home remains meaningful, but crop failure risk continues.", factIds: ["dry-dust-bowl-conditions"] }
            ]
        )),
        yearEvent(10, "Farm Foreclosures", "Debt and foreclosure push families off farms.", ["farm-foreclosures"], miniGame(
            "mg-1936-foreclosure",
            "Mini-Game: Auction Day",
            "A farm auction begins nearby.",
            "Choose how neighbors respond.",
            ["farm-foreclosures"],
            [
                { label: "I want neighbors to pool resources and help", effect: { money: -3, hope: 8 }, consequence: "Community support can soften hardship.", factIds: ["farm-foreclosures"] },
                { label: "I want to save our cash for my own family", effect: { money: 4, hope: -3 }, consequence: "Protecting your household is understandable, but community support weakens.", factIds: ["farm-foreclosures"] }
            ]
        ))
    ], [
        { label: "Map West", effect: { hope: 7 }, factIds: ["migration-west"] },
        { label: "Bread", effect: { food: 8 } }
    ]),
    annualStage(1937, "Opposition and Court Fight", "capitol", ["Court", "Critics", "Slow Recovery"], [
        yearEvent(5, "Court-Packing Controversy", "FDR's court-packing plan raises constitutional concerns.", ["court-packing"], miniGame(
            "mg-1937-court",
            "Mini-Game: Constitutional Check",
            "A proposal would add Supreme Court justices.",
            "Choose which argument you find more convincing.",
            ["court-packing"],
            [
                { label: "I want FDR to protect New Deal programs from the Court", effect: { hope: 4 }, consequence: "Supporters saw the plan as a way to preserve relief and reform.", factIds: ["court-packing", "new-deal-opposition"] },
                { label: "I worry the plan threatens balance of powers", effect: { hope: 3 }, consequence: "Critics argued the plan threatened constitutional balance.", factIds: ["court-packing"] }
            ]
        )),
        yearEvent(10, "New Deal Opposition", "Critics debate federal power, costs, and slow recovery.", ["new-deal-opposition"], miniGame(
            "mg-1937-opposition",
            "Mini-Game: Weigh the Criticism",
            "Neighbors argue about the New Deal.",
            "Choose which criticism you take most seriously.",
            ["new-deal-opposition"],
            [
                { label: "I think relief is necessary even if recovery is incomplete", effect: { food: 4, hope: 5 }, consequence: "The New Deal helps many families without fully ending the Depression.", factIds: ["new-deal-opposition", "unemployment-rises"] },
                { label: "I worry federal programs cost too much and move too slowly", effect: { money: 3, hope: -2 }, consequence: "Critics raised real concerns, while mass unemployment still demanded action.", factIds: ["new-deal-opposition"] }
            ]
        ))
    ], [
        { label: "Worker Voice", effect: { hope: 6, money: 3 }, factIds: ["wagner-act"] },
        { label: "Relief Check", effect: { money: 6, food: 4 }, factIds: ["social-security-act"] }
    ]),
    annualStage(1938, "Recovery Still Uneven", "hooverville", ["Part-Time Work", "Relief Office", "Farm Road"], [
        yearEvent(6, "Slow Recovery", "New Deal relief matters, but unemployment remains a major problem.", ["unemployment-rises", "new-deal-opposition"], miniGame(
            "mg-1938-recovery",
            "Mini-Game: Recovery Check",
            "A headline says the Depression is over.",
            "Choose how your family plans for an uneven recovery.",
            ["unemployment-rises", "new-deal-opposition"],
            [
                { label: "I want to keep using relief and work programs", effect: { food: 4, hope: 5 }, consequence: "Support remains important because recovery is still uneven.", factIds: ["unemployment-rises"] },
                { label: "I want to reduce dependence and rebuild private work", effect: { money: 3, hope: 2, food: -3 }, consequence: "Private recovery is a real hope, but many families are not secure yet.", factIds: ["new-deal-opposition"] }
            ]
        ))
    ], [
        { label: "Work Flyer", effect: { money: 5, hope: 4 }, factIds: ["migration-west"] },
        { label: "Soup Bowl", effect: { food: 8 }, factIds: ["breadlines"] }
    ]),
    annualStage(1939, "War Begins Abroad", "news", ["Radio Tower", "Newsstand", "Neutrality Debate"], [
        yearEvent(3, "Germany Invades Poland", "Germany invades Poland and war begins in Europe.", ["germany-invades-poland", "britain-france-declare-war"], miniGame(
            "mg-1939-poland",
            "Mini-Game: News Bulletin",
            "News from Europe reaches the radio.",
            "Choose how the news changes your view of U.S. policy.",
            ["germany-invades-poland", "britain-france-declare-war"],
            [
                { label: "I want to aid Britain and France without sending troops", effect: { readiness: 4, hope: 2 }, consequence: "War in Europe pushes some Americans toward limited aid.", factIds: ["germany-invades-poland", "britain-france-declare-war"] },
                { label: "I want to keep the U.S. out of Europe's war", effect: { hope: 4, readiness: -4 }, consequence: "Isolationism reflects fear of repeating World War I.", factIds: ["isolationism-debate"] }
            ]
        )),
        yearEvent(9, "Neutrality and Cash-and-Carry", "The U.S. debates neutrality while cash-and-carry expands aid.", ["neutrality-acts", "isolationism-debate", "cash-and-carry"], miniGame(
            "mg-1939-neutrality",
            "Mini-Game: Aid or Isolation",
            "Americans debate how involved the U.S. should be.",
            "Choose a historically plausible position.",
            ["neutrality-acts", "isolationism-debate"],
            [
                { label: "I want strict neutrality", effect: { hope: 4, readiness: -6 }, consequence: "Many Americans feared another war.", factIds: ["neutrality-acts", "isolationism-debate"] },
                { label: "I want cash-and-carry aid", effect: { money: 5, readiness: 5 }, consequence: "Aid grows while the U.S. stays formally out.", factIds: ["cash-and-carry"] }
            ]
        ))
    ], [
        { label: "Newspaper", effect: { hope: 3 }, factIds: ["germany-invades-poland"] },
        { label: "Radio Bulletin", effect: { hope: 3 }, factIds: ["britain-france-declare-war"] }
    ]),
    annualStage(1940, "Preparing Without Entering", "defense", ["Defense Plant", "Training Notice", "Radio"], [
        yearEvent(4, "Selective Training Act", "The first peacetime draft prepares for possible war.", ["selective-training-service-act"], miniGame(
            "mg-1940-draft",
            "Mini-Game: Readiness Tradeoff",
            "A training notice arrives.",
            "Choose how the family handles preparedness.",
            ["selective-training-service-act"],
            [
                { label: "I want to accept training as preparation", effect: { readiness: 8, hope: -2 }, consequence: "Preparedness rises, but anxiety does too.", factIds: ["selective-training-service-act"] },
                { label: "I worry a peacetime draft pulls families toward war", effect: { hope: 3, readiness: -4 }, consequence: "That fear was common, even as preparedness supporters gained ground.", factIds: ["selective-training-service-act", "isolationism-debate"] }
            ]
        )),
        yearEvent(9, "Arsenal of Democracy", "Defense industry expands before formal U.S. entry.", ["arsenal-of-democracy", "wartime-shipyard-factory-jobs"], miniGame(
            "mg-1940-arsenal",
            "Mini-Game: Defense Job",
            "A defense plant is hiring.",
            "Choose whether to take defense work.",
            ["arsenal-of-democracy"],
            [
                { label: "I want to take the defense job", effect: { money: 10, food: 5, readiness: 7 }, consequence: "Defense production starts pulling people into paid work.", factIds: ["arsenal-of-democracy", "wartime-shipyard-factory-jobs"] },
                { label: "I want to keep looking for nonwar work nearby", effect: { hope: 4, money: -4, readiness: -4 }, consequence: "Avoiding war work protects personal beliefs, while new defense wages grow elsewhere.", factIds: ["isolationism-debate", "wartime-shipyard-factory-jobs"] }
            ]
        ))
    ], [
        { label: "Defense Job", effect: { money: 8, food: 4, readiness: 6 }, factIds: ["arsenal-of-democracy"] },
        { label: "Training Notice", effect: { readiness: 8 }, factIds: ["selective-training-service-act"] }
    ]),
    annualStage(1941, "Lend-Lease and Pearl Harbor", "alert", ["Lend-Lease Crate", "Radio Alert", "Congress"], [
        yearEvent(3, "Lend-Lease", "Lend-Lease sends aid to nations fighting the Axis.", ["lend-lease"], miniGame(
            "mg-1941-lend-lease",
            "Mini-Game: Supply Route",
            "Allies need supplies before the U.S. formally enters the war.",
            "Choose which risk the country should accept.",
            ["lend-lease"],
            [
                { label: "I support Lend-Lease aid to nations fighting the Axis", effect: { readiness: 10, hope: 3 }, consequence: "Aid expands U.S. support before formal entry into war.", factIds: ["lend-lease"] },
                { label: "I worry Lend-Lease pulls the U.S. closer to war", effect: { hope: 4, readiness: -4 }, consequence: "That fear was common as aid blurred the line between neutrality and involvement.", factIds: ["lend-lease", "isolationism-debate"] }
            ]
        )),
        yearEvent(8, "Pearl Harbor", "Japan attacks Pearl Harbor on December 7, 1941.", ["pearl-harbor"], miniGame(
            "mg-1941-pearl-harbor",
            "Mini-Game: Radio Alert",
            "A radio alert interrupts the day: Pearl Harbor has been attacked.",
            "Choose what your family focuses on first.",
            ["pearl-harbor"],
            [
                { label: "I want to prepare for formal war and mobilization", effect: { readiness: 12, hope: -4 }, consequence: "Pearl Harbor leads to U.S. entry into World War II.", factIds: ["pearl-harbor", "us-declares-war"] },
                { label: "I want to steady the household before big decisions", effect: { hope: 4, readiness: -3 }, consequence: "Fear and grief are real, but national mobilization still accelerates.", factIds: ["pearl-harbor", "us-declares-war"] }
            ]
        )),
        yearEvent(11, "U.S. Declares War", "Congress declares war and mobilization accelerates.", ["us-declares-war"], miniGame(
            "mg-1941-war",
            "Mini-Game: Mobilization Begins",
            "War begins for the United States.",
            "Choose how to respond to the home-front shift.",
            ["us-declares-war"],
            [
                { label: "I want to look for work tied to mobilization", effect: { money: 6, readiness: 9, hope: -2 }, consequence: "War work begins transforming production and employment.", factIds: ["us-declares-war", "wartime-shipyard-factory-jobs"] },
                { label: "I want to protect family routines as long as possible", effect: { hope: 4, money: -3, readiness: -3 }, consequence: "Stability matters, but wartime demand soon reshapes the economy.", factIds: ["unemployment-falls-mobilization"] }
            ]
        ))
    ], [
        { label: "Lend-Lease Crate", effect: { readiness: 10, hope: 3 }, factIds: ["lend-lease"] },
        { label: "Radio Update", effect: { hope: 3 }, factIds: ["pearl-harbor"] }
    ]),
    annualStage(1942, "War Production and Civil Liberties", "wartime", ["WPB", "OPA", "Factory Gate"], [
        yearEvent(3, "War Production Board", "Factories convert to wartime production.", ["war-production-board", "wartime-shipyard-factory-jobs"], miniGame(
            "mg-1942-wpb",
            "Mini-Game: Convert the Factory",
            "A factory must shift from consumer goods to military production.",
            "Choose what production priority makes sense.",
            ["war-production-board"],
            [
                { label: "I want the factory to build war supplies", effect: { money: 8, readiness: 10 }, consequence: "The WPB directs industrial conversion.", factIds: ["war-production-board"] },
                { label: "I want to keep some consumer goods in production", effect: { food: 3, readiness: -5 }, consequence: "Civilians still need goods, but wartime priorities dominate industry.", factIds: ["war-production-board", "rationing"] }
            ]
        )),
        yearEvent(7, "OPA and Rationing", "Price controls and rationing manage scarce goods.", ["office-price-administration", "rationing"], miniGame(
            "mg-1942-opa",
            "Mini-Game: Ration Book",
            "Sugar, gasoline, and other goods are limited.",
            "Choose how to respond to rationing.",
            ["office-price-administration", "rationing"],
            [
                { label: "I want to follow ration rules", effect: { food: 7, readiness: 8 }, consequence: "Rationing stretches supplies for the war effort.", factIds: ["rationing", "office-price-administration"] },
                { label: "I want to stretch supplies through local swaps", effect: { food: 5, readiness: -4, hope: -2 }, consequence: "Families improvise under pressure, but ration systems depend on shared rules.", factIds: ["rationing"] }
            ]
        )),
        yearEvent(11, "Japanese American Incarceration", "Japanese American incarceration is a grave civil liberties violation.", ["japanese-american-incarceration"], miniGame(
            "mg-1942-incarceration",
            "Mini-Game: Civil Liberties",
            "The government orders Japanese American incarceration.",
            "Choose how to respond to fear and civil liberties.",
            ["japanese-american-incarceration"],
            [
                { label: "I want to speak up for constitutional rights", effect: { hope: 4 }, consequence: "The policy was a serious civil liberties violation rooted in wartime fear.", factIds: ["japanese-american-incarceration"] },
                { label: "I feel pressure to stay silent during wartime fear", effect: { hope: -5 }, consequence: "Silence may feel safer, but it leaves a grave injustice unchallenged.", factIds: ["japanese-american-incarceration"] }
            ]
        ))
    ], [
        { label: "WPB Contract", effect: { money: 8, readiness: 8 }, factIds: ["war-production-board"] },
        { label: "Ration Book", effect: { food: 8, readiness: 6 }, factIds: ["rationing"] }
    ]),
    annualStage(1943, "Workers and War Bonds", "wartime", ["Shipyard", "War Bonds", "Rosie Poster"], [
        yearEvent(3, "Rosie and Women in Industry", "Women enter industrial jobs in large numbers.", ["rosie-women-industry"], miniGame(
            "mg-1943-rosie",
            "Mini-Game: Labor Shift",
            "A factory needs more workers.",
            "Choose how your household handles the labor shift.",
            ["rosie-women-industry"],
            [
                { label: "I want women in the family to take industrial work", effect: { money: 8, hope: 6 }, consequence: "Rosie the Riveter symbolizes women entering wartime industry.", factIds: ["rosie-women-industry"] },
                { label: "I worry about childcare, wages, and community pressure", effect: { hope: 3, money: -3 }, consequence: "Barriers were real, even as wartime factories needed workers.", factIds: ["rosie-women-industry", "wartime-shipyard-factory-jobs"] }
            ]
        )),
        yearEvent(7, "African American Industrial Migration", "African Americans move to industrial jobs while facing discrimination.", ["african-american-industrial-migration"], miniGame(
            "mg-1943-migration",
            "Mini-Game: Industrial Migration",
            "A war-industry job opens in another city.",
            "Choose how to weigh opportunity and discrimination.",
            ["african-american-industrial-migration"],
            [
                { label: "I want to move for the industrial job despite discrimination", effect: { money: 7, hope: 2 }, consequence: "War work opens opportunities, while discrimination remains a serious barrier.", factIds: ["african-american-industrial-migration"] },
                { label: "I want to stay near community support for now", effect: { hope: 5, money: -3 }, consequence: "Staying can protect support networks, but industrial wages may be elsewhere.", factIds: ["african-american-industrial-migration"] }
            ]
        )),
        yearEvent(11, "War Bonds", "Families buy war bonds to help finance the war.", ["war-bonds"], miniGame(
            "mg-1943-bonds",
            "Mini-Game: Bond Drive",
            "The government asks families to buy war bonds.",
            "Choose a financial tradeoff.",
            ["war-bonds"],
            [
                { label: "I want to buy a war bond", effect: { money: -6, readiness: 10, hope: 5 }, consequence: "War bonds help finance federal wartime spending.", factIds: ["war-bonds"] },
                { label: "I want to save every dollar", effect: { money: 6, readiness: -5 }, consequence: "Keeping cash close protects the household budget, but war financing support falls.", factIds: ["war-bonds"] }
            ]
        ))
    ], [
        { label: "Rosie Poster", effect: { hope: 8 }, factIds: ["rosie-women-industry"] },
        { label: "War Bond", effect: { readiness: 9, hope: 4 }, factIds: ["war-bonds"] }
    ]),
    annualStage(1944, "Mobilization Peaks", "wartime", ["Shipyard Jobs", "Assembly Line", "Housing"], [
        yearEvent(5, "Shipyard and Factory Jobs", "War industries and military service pull unemployment down.", ["wartime-shipyard-factory-jobs", "unemployment-falls-mobilization"], miniGame(
            "mg-1944-jobs",
            "Mini-Game: Why Jobs Rise",
            "Unemployment falls during the war.",
            "Choose which explanation you emphasize.",
            ["unemployment-falls-mobilization"],
            [
                { label: "I think war production and military service are decisive", effect: { money: 10, food: 5, hope: 6 }, consequence: "Wartime demand helps end Depression-era unemployment.", factIds: ["unemployment-falls-mobilization", "wartime-shipyard-factory-jobs"] },
                { label: "I think New Deal relief still matters in the transition", effect: { food: 5, hope: 5 }, consequence: "New Deal support mattered, but wartime mobilization drives the job surge.", factIds: ["new-deal-opposition", "unemployment-falls-mobilization"] }
            ]
        )),
        yearEvent(10, "Housing and Family Strain", "War work brings jobs but also long hours, housing shortages, and family separation.", ["wartime-shipyard-factory-jobs"], miniGame(
            "mg-1944-strain",
            "Mini-Game: Home Front Strain",
            "A shipyard job pays well but the city is crowded.",
            "Choose the tradeoff.",
            ["wartime-shipyard-factory-jobs"],
            [
                { label: "I want to move for war work", effect: { money: 9, food: 5, hope: -3 }, consequence: "The job helps, but housing stress is real.", factIds: ["wartime-shipyard-factory-jobs"] },
                { label: "I want to stay home", effect: { hope: 4, money: -5 }, consequence: "Stability remains, but wartime job growth is elsewhere.", factIds: ["unemployment-falls-mobilization"] }
            ]
        ))
    ], [
        { label: "Shipyard Job", effect: { money: 9, readiness: 5 }, factIds: ["wartime-shipyard-factory-jobs"] },
        { label: "Factory Paycheck", effect: { money: 9, food: 5 }, factIds: ["wartime-shipyard-factory-jobs"] }
    ]),
    annualStage(1945, "War Ends", "sunrise", ["War Ends", "Factory Lights", "Homecoming"], [
        yearEvent(5, "War Ends", "World War II ends in 1945.", ["wwii-ends-1945"], miniGame(
            "mg-1945-war-ends",
            "Mini-Game: Historical Reflection",
            "The war ends and the economy has changed.",
            "Choose which legacy stands out most.",
            ["wwii-ends-1945"],
            [
                { label: "I think wartime mobilization transformed the economy", effect: { hope: 10 }, consequence: "Production, federal spending, and military service changed the economy.", factIds: ["wwii-ends-1945", "unemployment-falls-mobilization"] },
                { label: "I think New Deal reforms changed government expectations", effect: { hope: 8 }, consequence: "That legacy mattered too, even though wartime demand ended mass unemployment.", factIds: ["first-hundred-days", "social-security-act", "unemployment-falls-mobilization"] }
            ]
        )),
        yearEvent(10, "Reflection", "The U.S. emerges economically powerful, but sacrifices and inequalities remain.", ["wwii-ends-1945", "unemployment-falls-mobilization"], miniGame(
            "mg-1945-reflect",
            "Mini-Game: Final Balance",
            "How should the period be remembered?",
            "Choose which truth you want the ending to emphasize.",
            ["wwii-ends-1945"],
            [
                { label: "I think relief, reform, mobilization, and sacrifice all mattered", effect: { hope: 8 }, consequence: "That balanced interpretation fits the full journey.", factIds: ["wwii-ends-1945"] },
                { label: "I think opportunity grew while inequality and loss remained", effect: { hope: 7 }, consequence: "That emphasis captures the gains and costs of the era.", factIds: ["wwii-ends-1945", "african-american-industrial-migration", "japanese-american-incarceration"] }
            ]
        ))
    ], [
        { label: "War Ends Headline", effect: { hope: 10 }, factIds: ["wwii-ends-1945"] },
        { label: "Homecoming", effect: { hope: 8 }, factIds: ["wwii-ends-1945"] }
    ])
];

const CHOICE_COPY = {
    "mg-1929-crash": {
        prompt: "Stock Market Crash: Sell Shares or Hold On?",
        context: "It is 1929, and falling stock prices are shaking banks, businesses, and household savings. Many investors had bought on margin, so borrowed money made losses worse. Your family is trying to protect food and cash while no one knows how far the panic will spread."
    },
    "mg-1929-margin": {
        prompt: "Buying on Margin: Borrow More or Cut Risk?",
        context: "Buying on margin means purchasing stock with borrowed money. During a rising market it can make gains look larger, but during a crash it makes losses hit faster. This choice asks whether hope for a rebound is worth carrying more debt."
    },
    "mg-1930-bank": {
        prompt: "Bank Failures: Keep Cash or Trust the Bank?",
        context: "In the early Depression, many banks failed because depositors rushed to withdraw money and banks had made risky loans. Before federal deposit insurance, a failed bank could wipe out a family's savings. Your choice reflects the tension between personal caution and public faith in banks."
    },
    "mg-1930-breadline": {
        prompt: "Breadline Relief: Accept Help or Try Neighbors First?",
        context: "Breadlines became visible signs of hunger during the Depression. Private charities, churches, and neighbors helped many people, but they could not meet the scale of national unemployment. Families often balanced pride, survival, and community support."
    },
    "mg-1931-work": {
        prompt: "Job Search: Keep Looking or Conserve Energy?",
        context: "By 1931, unemployment had become a daily reality for millions of workers. Factory shutdowns and falling demand meant that searching harder did not always produce a job. This choice is about how a family spends food, time, and hope when work is scarce."
    },
    "mg-1931-hooverville": {
        prompt: "Rent Is Due: Family Shelter or Savings?",
        context: "Hoovervilles were temporary communities built by people who had lost homes or steady income. They reflected both the depth of hardship and the weakness of relief systems before the New Deal. Your family must decide whether to preserve shelter, savings, or family support."
    },
    "mg-1932-election": {
        prompt: "1932 Election: FDR Promises Relief, Recovery, and Reform",
        context: "Franklin D. Roosevelt campaigned during a crisis that private charity and local governments could not contain. His promise of a New Deal suggested a larger federal role in the economy. Voters still disagreed over whether Washington or local/private action should lead recovery."
    },
    "mg-1932-relief": {
        prompt: "Emergency Relief: Ask for Aid or Keep Searching?",
        context: "By 1932, many families needed food before steady work returned. Relief could carry stigma, and public aid was often limited before the New Deal expanded federal action. This choice shows that survival strategies were practical, emotional, and political at the same time."
    },
    "mg-1933-bank-holiday": {
        prompt: "Bank Holiday: Use Reopened Banks or Hold Cash?",
        context: "In March 1933, Roosevelt temporarily closed banks so officials could inspect them. The Emergency Banking Act aimed to reopen sound banks and stop panic withdrawals. Families had to decide how much faith to place in a system that had recently failed many depositors."
    },
    "mg-1933-fdic": {
        prompt: "Fireside Chat and FDIC: Deposit a Little or Wait?",
        context: "FDR used Fireside Chats to explain federal action directly over the radio. The FDIC helped protect bank deposits and made ordinary savers more willing to use banks again. This was reform, not instant prosperity, but it changed expectations of federal responsibility."
    },
    "mg-1933-programs": {
        prompt: "First New Deal Jobs: Leave for CCC Work or Stay Local?",
        context: "New Deal agencies experimented with work relief, public construction, conservation, and regional planning. The CCC offered jobs that could help families, but often required separation from home. The choice has no perfect answer because wages, dignity, and family ties all matter."
    },
    "mg-1934-cwa": {
        prompt: "CWA Paycheck: Food Now or Debt Pressure?",
        context: "The Civil Works Administration created short-term emergency jobs in the winter of 1933-1934. A paycheck could buy food, pay debt, or keep a household going a little longer. Short-term relief helped, but it did not mean the Depression was over."
    },
    "mg-1934-farm": {
        prompt: "Farm Debt: Federal Aid or Local Independence?",
        context: "Farm families faced drought, falling prices, debt, and foreclosure in the 1930s. The Agricultural Adjustment Act tried to raise prices, but its effects were uneven and sometimes controversial. Families had to weigh independence against the risk of losing land."
    },
    "mg-1935-wpa": {
        prompt: "WPA Job Offer: Public Work or Private Search?",
        context: "The Works Progress Administration created jobs building roads, schools, parks, and public buildings. Critics worried about federal spending and dependence, while supporters saw wages and useful community projects. This choice asks how to balance work relief with the desire for private employment."
    },
    "mg-1935-social-security": {
        prompt: "Social Security Act: Safety Net or Immediate Cost?",
        context: "The Social Security Act created a federal old-age safety net and changed expectations of government. Payroll taxes raised concerns because many workers were already under pressure. The policy shows how New Deal reform could help long-term security while creating short-term debate."
    },
    "mg-1935-wagner": {
        prompt: "Wagner Act: Organize Workers or Avoid Job Risk?",
        context: "The Wagner Act protected workers' rights to organize and bargain collectively. Workers hoped unions could improve wages and conditions, but organizing could also create tension with employers. The choice reflects why labor rights were both empowering and risky."
    },
    "mg-1936-migration": {
        prompt: "Migration West: Leave the Farm or Try Again?",
        context: "Dry conditions, debt, and mechanization pushed many Great Plains families onto the road. Going west could mean hope for farm labor, but also travel costs, low wages, and crowded camps. Staying protected home ties but left families exposed to another failed crop."
    },
    "mg-1936-foreclosure": {
        prompt: "Farm Auction: Mutual Aid or Save Your Own Cash?",
        context: "Farm foreclosures and auctions became painful symbols of rural Depression hardship. Neighbors sometimes tried to help each other keep land or tools, but every family was under pressure. This choice shows the strain between community solidarity and household survival."
    },
    "mg-1937-court": {
        prompt: "Court-Packing Debate: Protect New Deal Laws or Guard the Courts?",
        context: "After the Supreme Court challenged some New Deal measures, FDR proposed adding justices. Supporters wanted to protect reform programs during an emergency. Critics warned that changing the Court could weaken checks and balances."
    },
    "mg-1937-opposition": {
        prompt: "New Deal Opposition: Necessary Relief or Too Much Federal Power?",
        context: "By the late 1930s, Americans argued over the New Deal's costs, speed, and reach. Many programs helped families and communities, but recovery remained incomplete. This debate is central to APUSH because it shows both the expansion and the limits of federal power."
    },
    "mg-1938-recovery": {
        prompt: "Uneven Recovery: Keep Relief or Rebuild Private Work?",
        context: "Some indicators improved by 1938, but many families still lacked security. New Deal programs provided relief and reform, yet mass unemployment remained a major issue before WWII mobilization. The question is not whether recovery existed, but who felt it and how much."
    },
    "mg-1939-poland": {
        prompt: "War in Europe: Aid Allies or Stay Out?",
        context: "Germany invaded Poland in 1939, and Britain and France declared war. The United States did not immediately enter the conflict. Americans debated whether aid could stop aggression or whether involvement would repeat the trauma of World War I."
    },
    "mg-1939-neutrality": {
        prompt: "Neutrality and Cash-and-Carry: Distance or Limited Aid?",
        context: "Neutrality Acts reflected the desire to avoid another European war. Cash-and-carry allowed belligerents to buy supplies if they paid cash and transported them. This compromise kept the U.S. formally out while still moving policy toward aid."
    },
    "mg-1940-draft": {
        prompt: "Selective Training Act: Prepare or Resist a Peacetime Draft?",
        context: "The Selective Training and Service Act created the first peacetime draft in U.S. history. Preparedness supporters saw danger growing abroad. Critics feared that military preparation could pull the country closer to war."
    },
    "mg-1940-arsenal": {
        prompt: "Arsenal of Democracy: Take Defense Work or Avoid War Industry?",
        context: "Before formal entry into World War II, defense orders expanded factories and shipyards. Roosevelt described the United States as an Arsenal of Democracy. Defense jobs offered wages while also tying workers to a war many Americans still hoped to avoid."
    },
    "mg-1941-lend-lease": {
        prompt: "Lend-Lease: Aid the Allies or Guard Neutrality?",
        context: "The Lend-Lease Act sent aid to nations fighting the Axis before the U.S. entered the war. Supporters argued that supplying allies strengthened U.S. security. Opponents worried that aid blurred the line between neutrality and war."
    },
    "mg-1941-pearl-harbor": {
        prompt: "Pearl Harbor: Mobilize or Steady the Household?",
        context: "Japan attacked Pearl Harbor on December 7, 1941. The attack sharply changed public opinion and pushed the United States into World War II. Families faced fear and grief while the federal government moved rapidly toward mobilization."
    },
    "mg-1941-war": {
        prompt: "U.S. Declares War: Join Mobilization or Protect Routine?",
        context: "After Pearl Harbor, Congress declared war and the home front began to change quickly. Factories, military service, and federal spending expanded. Families had to adapt to a wartime economy before knowing how long the conflict would last."
    },
    "mg-1942-wpb": {
        prompt: "War Production Board: Military Output or Civilian Goods?",
        context: "The War Production Board directed factories to convert from consumer goods to military production. This shift created jobs and helped supply the war effort. It also meant households faced shortages and fewer consumer choices."
    },
    "mg-1942-opa": {
        prompt: "OPA Rationing: Follow Rules or Stretch Supplies Locally?",
        context: "The Office of Price Administration managed rationing and price controls during the war. Ration books limited access to goods such as gasoline, sugar, and meat. Families improvised, but the system depended on shared sacrifice."
    },
    "mg-1942-incarceration": {
        prompt: "Japanese American Incarceration: Speak Up or Stay Silent?",
        context: "In 1942, the federal government forced many Japanese Americans from their homes and into incarceration camps. This was a serious civil liberties violation shaped by wartime fear and racism. The choice asks how difficult it can be to defend rights during a national emergency."
    },
    "mg-1943-rosie": {
        prompt: "Women in War Industry: Take Factory Work or Weigh Barriers?",
        context: "Wartime factories needed workers, and many women entered industrial jobs in large numbers. Rosie the Riveter became a symbol of this shift. Opportunities expanded, but women still faced unequal pay, childcare pressures, and expectations about leaving jobs after the war."
    },
    "mg-1943-migration": {
        prompt: "Industrial Migration: Move for War Work or Stay with Support?",
        context: "War industries drew workers to cities, including many African Americans seeking industrial jobs. These moves created opportunity but did not erase discrimination in hiring, housing, or daily life. The choice weighs wages against community support and unequal treatment."
    },
    "mg-1943-bonds": {
        prompt: "War Bonds: Finance the War or Keep Cash Close?",
        context: "War bonds helped the federal government finance wartime spending. Buying them was promoted as patriotic sacrifice, but families still needed cash for rent, food, and emergencies. This choice connects personal finance to the scale of federal mobilization."
    },
    "mg-1944-jobs": {
        prompt: "Falling Unemployment: War Mobilization and New Deal Legacy",
        context: "By 1944, military service and war production had dramatically expanded employment. New Deal relief and reform still mattered, but wartime demand pushed job growth much further. The Depression faded through mobilization, not through one simple policy."
    },
    "mg-1944-strain": {
        prompt: "Home Front Strain: Move for Shipyard Work or Stay Home?",
        context: "Shipyards and factories offered wages that many families had not seen during the Depression. War work also brought long hours, housing shortages, and family separation. The wartime economy created opportunity and stress at the same time."
    },
    "mg-1945-war-ends": {
        prompt: "1945 Reflection: Wartime Economy and New Deal Legacy",
        context: "World War II ended in 1945 after years of mobilization. Federal spending, industrial production, and military service helped end Depression-era mass unemployment. The New Deal had changed expectations of government, but wartime demand transformed the economy."
    },
    "mg-1945-reflect": {
        prompt: "Final Balance: Opportunity, Sacrifice, and Unequal Change",
        context: "The years from 1929 to 1945 changed the relationship between citizens, government, and the economy. Relief, reform, and mobilization all mattered. The era created jobs and new expectations while also exposing inequality, incarceration, sacrifice, and loss."
    }
};

const APUSH_CONTEXT_SENTENCES = {
    "stock-crash-1929": "In APUSH terms, the crash weakened demand and confidence, but bank failures and unemployment made the Depression deeper.",
    "buying-on-margin": "Buying on margin mattered because borrowed money turned a market decline into a wider financial crisis.",
    "bank-failures": "Before FDIC protection, bank failures could erase savings and intensify panic in local communities.",
    "breadlines": "Breadlines show why private charity alone could not meet the scale of Depression hardship.",
    "unemployment-rises": "High unemployment reduced family income and consumer demand, which made recovery harder.",
    "hoovervilles": "Hoovervilles became visible evidence that housing insecurity was tied to job loss and weak relief systems.",
    "fdr-elected-1932": "FDR's election signaled public demand for a larger federal response to economic collapse.",
    "emergency-banking-act": "The Emergency Banking Act used federal inspection and reopening to calm a banking crisis after the 1933 bank holiday.",
    "bank-holiday": "The Bank Holiday was meant to stop runs long enough for the government to decide which banks could reopen.",
    "fireside-chats": "Fireside Chats mattered because Roosevelt explained policy directly to households by radio.",
    "fdic": "FDIC insurance was a reform that made ordinary depositors more willing to use banks.",
    "ccc": "The CCC shows New Deal relief through wages, conservation work, and federal job creation.",
    "cwa": "The CWA was emergency work relief, so its help was real but temporary.",
    "pwa": "The PWA used large public works to create jobs and stimulate recovery.",
    "wpa": "The WPA connected wages to public projects, making work relief more visible in communities.",
    "tva": "The TVA combined jobs, electricity, and regional planning in the Tennessee Valley.",
    "aaa": "The AAA tried to raise farm prices, but its benefits were uneven across rural America.",
    "social-security-act": "Social Security was reform because it created a long-term federal safety net.",
    "wagner-act": "The Wagner Act expanded worker protections and strengthened organized labor.",
    "farm-foreclosures": "Farm foreclosures show how debt and falling prices pushed rural families into crisis.",
    "dry-dust-bowl-conditions": "Dust Bowl conditions added environmental disaster to economic hardship.",
    "migration-west": "Migration west offered hope for work but often brought low wages, discrimination, and crowded camps.",
    "court-packing": "The court-packing controversy raised constitutional questions about checks and balances.",
    "new-deal-opposition": "New Deal opposition reminds students that Americans disagreed over federal power, spending, and recovery.",
    "neutrality-acts": "Neutrality laws reflected fear that trade and loans had pulled the United States into World War I.",
    "germany-invades-poland": "Germany's invasion of Poland in 1939 began the war in Europe and forced new U.S. neutrality debates.",
    "britain-france-declare-war": "Britain and France declaring war made the European conflict impossible for Americans to ignore.",
    "isolationism-debate": "Isolationism was not simple indifference; many Americans feared another costly foreign war.",
    "cash-and-carry": "Cash-and-carry allowed limited aid while keeping the United States formally out of war.",
    "selective-training-service-act": "The Selective Training and Service Act marked a major step toward military preparedness before Pearl Harbor.",
    "arsenal-of-democracy": "The Arsenal of Democracy idea connected U.S. industrial production to Allied survival before formal entry.",
    "lend-lease": "Lend-Lease moved the United States closer to the Allies by sending supplies before declaring war.",
    "pearl-harbor": "Pearl Harbor changed the debate because a direct attack made U.S. entry into World War II immediate.",
    "us-declares-war": "The declaration of war accelerated federal spending, military service, and home-front production.",
    "war-production-board": "The War Production Board directed industrial conversion for total war.",
    "office-price-administration": "The OPA used rationing and price controls to manage scarcity and inflation.",
    "rationing": "Rationing connected everyday household choices to wartime supply needs.",
    "war-bonds": "War bonds helped finance federal wartime spending through household savings.",
    "rosie-women-industry": "Rosie symbolism represents women entering industrial jobs while gender inequality remained.",
    "african-american-industrial-migration": "African American industrial migration created new job opportunities while discrimination continued.",
    "japanese-american-incarceration": "Japanese American incarceration was a grave civil liberties violation during wartime.",
    "wartime-shipyard-factory-jobs": "Factory and shipyard jobs helped pull many families out of Depression-era unemployment.",
    "unemployment-falls-mobilization": "Wartime mobilization, not the New Deal alone, drove the sharp fall in unemployment.",
    "wwii-ends-1945": "By 1945, the U.S. economy had been transformed by federal spending, production, and military mobilization."
};

function sentenceCount(text = ""){
    return (text.match(/[.!?](\s|$)/g) || []).length;
}

function apushContextFor(factIds = []){
    for(let factId of factIds){
        if(APUSH_CONTEXT_SENTENCES[factId]) return APUSH_CONTEXT_SENTENCES[factId];
    }
    return "APUSH takeaway: this decision shows how people weighed survival, federal action, and uncertainty during a changing economy.";
}

function cleanChoiceLanguage(text = ""){
    return text
        .replace(/until (trust|confidence)\s+returns/gi, "while banks are still being tested")
        .replace(/helps confidence\s+return/gi, "helps rebuild public faith in banks")
        .replace(new RegExp("confidence " + "rebuilds" + "\\s+more slowly", "gi"), "families stay cautious about banks")
        .replace(/depends on\s+confidence/gi, "depends on people believing inspected banks can operate");
}

function enrichChoiceContent(stages){
    for(let stage of stages){
        for(let event of stage.events || []){
            const choice = event.miniGame;
            if(!choice) continue;
            const copy = CHOICE_COPY[choice.id];
            if(copy){
                choice.prompt = copy.prompt;
                choice.context = copy.context;
            }
            else{
                choice.context = `${choice.prompt} This decision appears during ${stage.label}. It connects personal survival to larger APUSH themes of government, work, reform, and mobilization.`;
            }
            choice.instructions = cleanChoiceLanguage(choice.instructions);
            for(let option of choice.options){
                option.label = cleanChoiceLanguage(option.label);
                option.consequence = cleanChoiceLanguage(option.consequence);
                if(sentenceCount(option.consequence) < 2){
                    option.consequence = `${option.consequence} ${apushContextFor([...(option.factIds || []), ...(choice.factIds || [])])}`;
                }
            }
        }
    }
}

function addMysteryCollectibles(stages){
    for(let stage of stages){
        if(stage.startYear >= 1933 && stage.startYear <= 1935){
            stage.collectibles.push({ label: "New Deal Wheel", effect: {}, mysteryGame: "new-deal-wheel", factIds: ["ccc", "wpa", "tva", "fdic"] });
        }
        if(stage.startYear >= 1942 && stage.startYear <= 1944){
            stage.collectibles.push({ label: "Production Crate", effect: {}, mysteryGame: "production-crate", factIds: ["war-production-board", "rationing"] });
        }
    }
}

function rebalanceEffectForDifficulty(effect = {}){
    const tuned = {};
    for(let [key, value] of Object.entries(effect)){
        if(!value){
            tuned[key] = value;
            continue;
        }
        const scale = value > 0
            ? (key == "readiness" ? POSITIVE_READINESS_SCALE : POSITIVE_RESOURCE_SCALE)
            : NEGATIVE_RESOURCE_SCALE;
        const tunedValue = value > 0
            ? Math.max(1, Math.round(value * scale))
            : Math.min(-1, Math.round(value * scale));
        tuned[key] = tunedValue;
    }
    return tuned;
}

function tuneEffectSet(items = []){
    for(let item of items){
        if(item.effect) item.effect = rebalanceEffectForDifficulty(item.effect);
    }
}

function rebalanceContentForDifficulty(stages){
    for(let stage of stages){
        tuneEffectSet(stage.obstacles);
        tuneEffectSet(stage.collectibles);
        for(let event of stage.events || []){
            if(!event.miniGame) continue;
            tuneEffectSet(event.miniGame.options);
        }
    }
    for(let miniGame of Object.values(SPECIAL_MINIGAMES)){
        tuneEffectSet(miniGame.outcomes);
        tuneEffectSet(miniGame.options);
    }
}

function pressureForStage(stage){
    if(!stage) return {};
    if(stage.startYear <= 1932) return { money: -0.12, food: -0.12, hope: -0.08 };
    if(stage.startYear == 1933) return { money: -0.08, food: -0.07, hope: -0.05 };
    if(stage.visual == "dry-farm") return { money: -0.09, food: -0.13, hope: -0.08 };
    if(stage.startYear <= 1938) return { money: -0.07, food: -0.06, hope: -0.06 };
    if(stage.startYear <= 1941) return { money: -0.05, food: -0.04, hope: -0.09 };
    if(stage.visual == "wartime") return { money: -0.03, food: -0.08, hope: -0.08 };
    return { money: -0.02, food: -0.03, hope: -0.04 };
}

enrichChoiceContent(YEARLY_STAGES);
addMysteryCollectibles(YEARLY_STAGES);
rebalanceContentForDifficulty(YEARLY_STAGES);

APUSH_CONTENT.stages = YEARLY_STAGES;
APUSH_CONTENT.choices = YEARLY_STAGES.flatMap((stage)=> stage.events.map((event)=> event.miniGame).filter(Boolean));

const CHOICES_BY_ID = Object.fromEntries(APUSH_CONTENT.choices.map((choice)=> [choice.id, choice]));
const TOTAL_DURATION = APUSH_CONTENT.stages.reduce((sum, stage)=> sum + stage.duration, 0);

class Player{
    constructor(speedVector, postionVector){
        this.speedVector = speedVector;
        this.postionVector = postionVector;
        this.lastarrowup = true;
        this.allowedjumps = 1;
        this.jumps = this.allowedjumps;
        this.state = "idle";
        this.firstupdate = true;
        this.invulnerableBlink = false;
        this.isSliding = false;
        this.frames = new FrameTracker(scale);
        this.frames.add(this.size, "idle", 6, "./assets/craftpix-net-439247-free-fantasy-chibi-male-sprites-pixel-art/Wizard/Idle.png", 0.055);
        this.frames.add(this.size, "running", 8, "./assets/craftpix-net-439247-free-fantasy-chibi-male-sprites-pixel-art/Wizard/Run.png", 0.052);
        this.frames.add(this.size, "sliding", 8, "./assets/craftpix-net-439247-free-fantasy-chibi-male-sprites-pixel-art/Wizard/Run.png", 0.035);
        this.frames.add(this.size, "jumping", 11, "./assets/craftpix-net-439247-free-fantasy-chibi-male-sprites-pixel-art/Wizard/Jump.png", 0.08);
    }

    get type(){
        return "player";
    }

    getCollisionBox(){
        const collisionHeight = this.isSliding ? this.size.y * 0.44 : this.size.y;
        return {
            x: this.postionVector.x + 0.35,
            y: this.postionVector.y + this.size.y - collisionHeight,
            width: this.size.x - 0.7,
            height: collisionHeight
        };
    }

    update(game, timeframe, arrowkey){
        const onGround = this.postionVector.y + this.size.y >= game.height - GroundLevel - 0.05;
        this.isSliding = arrowkey.arrowdown && onGround && !arrowkey.arrowup;
        if (this.postionVector.y + this.size.y < game.height - GroundLevel){
            this.isSliding = false;
            if(this.jumps > 0 && arrowkey.arrowup && !this.lastarrowup){
                this.speedVector.y = jump + 5;
                this.jumps--;
            }
            this.state = "jumping";
            this.speedVector.y = this.speedVector.y + timeframe * gravitiy;
        }
        else if(arrowkey.arrowup && this.speedVector.y >= 0){
            this.speedVector.y = jump;
            this.jumps = this.allowedjumps;
        }
        else{
            if(!this.firstupdate) this.state = this.isSliding ? "sliding" : "running";
            this.firstupdate = false;
            this.speedVector.y = 0;
        }
        let moveYdistance = this.speedVector.y * timeframe;
        if(!(this.postionVector.y + this.size.y + moveYdistance > game.height - GroundLevel)){
            this.postionVector.y = this.postionVector.y + moveYdistance;
        }
        else{
            this.postionVector.y = game.height - GroundLevel - this.size.y;
        }
        this.lastarrowup = arrowkey.arrowup;
    }
}
Player.prototype.size = new Vector(3.1, 5.2);

class HistoricalActor{
    constructor(kind, data, postionVector, size, speed){
        this.kind = kind;
        this.data = data;
        this.postionVector = postionVector;
        this.size = size;
        this.speedVector = new Vector(speed, 0);
        this.remove = false;
        this.type = kind;
    }

    update(game, timeframe){
        this.postionVector.x = rounddecimat(this.postionVector.x + this.speedVector.x * timeframe);
        if(this.postionVector.x + this.size.x < -10){
            this.remove = true;
            return;
        }
        if(overlap(game.player, this)){
            if(this.kind == "event"){
                game.triggerEvent(this.data);
                this.remove = true;
            }
            else if(this.kind == "collectible"){
                game.collect(this);
                this.remove = true;
            }
            else if(game.invulnerability <= 0){
                game.hitObstacle(this);
                this.remove = true;
            }
        }
    }
}

class Game {
    constructor(width, height, scale, player, display){
        this.width = width;
        this.height = height;
        this.scale = scale;
        this.player = player;
        this.actors = [];
        this.state = "start";
        this.stageIndex = 0;
        this.stageTime = 0;
        this.elapsed = 0;
        this.resources = DEBUG_HARDSHIP_START
            ? { money: 1, food: 4, hope: 6, readiness: 0 }
            : { ...APUSH_CONTENT.startingResources };
        this.encounteredFacts = new Set();
        this.narrativesShown = new Set();
        this.newsShown = new Set();
        this.eventsSpawned = new Set();
        this.choicesShown = new Set();
        this.spawnTimer = 1.5;
        this.invulnerability = 0;
        this.narrativeQueue = [];
        this.activeNarrative = null;
        this.narrativeTimer = 0;
        this.newsMessage = null;
        this.newsTimer = 0;
        this.sourcePopup = null;
        this.sourceTimer = 0;
        this.lastResourceNote = "";
        this.noteTimer = 0;
        this.currentChoice = null;
        this.choiceResult = null;
        this.currentMiniGame = null;
        this.miniResult = null;
        this.pendingHardship = false;
        this.display = new display(this);
        this.enterStage(0);
    }

    get stage(){
        return APUSH_CONTENT.stages[this.stageIndex];
    }

    get totalProgress(){
        return clamp((this.elapsed / TOTAL_DURATION) * 100, 0, 100);
    }

    get yearLabel(){
        const stage = this.stage;
        if(!stage) return "1945";
        if(stage.startYear == stage.endYear) return stage.years;
        const progress = clamp(this.stageTime / stage.duration, 0, 0.999);
        return `${Math.floor(stage.startYear + ((stage.endYear - stage.startYear + 1) * progress))}`;
    }

    startJourney(){
        if(this.state == "start"){
            this.state = "playing";
            this.queueNarrative("Hit event boxes to open choices. Jump over low boxes or slide under high boxes to dodge.", []);
        }
    }

    enterStage(index){
        this.stageIndex = index;
        const stage = this.stage;
        if(!stage){
            this.completeJourney();
            return;
        }
        this.markFacts(stage.factIds);
        this.spawnTimer = 1.2;
        this.actors = this.actors.filter((actor)=> actor.kind == "collectible");
        this.narrativeQueue = [];
        this.activeNarrative = null;
        this.narrativeTimer = 0;
        this.queueNarrative(stage.label, stage.factIds);
    }

    markFacts(factIds = []){
        for(let factId of factIds){
            if(FACTS_BY_ID[factId]){
                this.encounteredFacts.add(factId);
            }
        }
    }

    update(frametime, keys){
        if(this.state == "start" || this.state == "hardship" || this.state == "complete"){
            this.updateMessageTimers(frametime);
            this.display.sync(this);
            return;
        }
        if(this.state == "choice" || this.state == "mini"){
            this.updateMessageTimers(frametime);
            this.display.sync(this);
            return;
        }
        if(keys.start){
            this.startJourney();
        }

        this.invulnerability = Math.max(0, this.invulnerability - frametime);
        this.updateMessageTimers(frametime);
        this.player.update(this, frametime, keys);
        this.updateActors(frametime);
        this.spawnActors(frametime);
        this.applyEraPressure(frametime);

        const timelineFrame = frametime * TIMELINE_MULTIPLIER;
        this.elapsed += timelineFrame;
        this.stageTime += timelineFrame;
        this.checkTimelineEvents();
        this.advanceStageIfNeeded();
        this.checkHardship();
        this.display.sync(this);
    }

    updateMessageTimers(frametime){
        if(this.noteTimer > 0){
            this.noteTimer = Math.max(0, this.noteTimer - frametime);
        }
        if(this.newsTimer > 0){
            this.newsTimer = Math.max(0, this.newsTimer - frametime);
        }
        else{
            this.newsMessage = null;
        }
        if(this.sourceTimer > 0){
            this.sourceTimer = Math.max(0, this.sourceTimer - frametime);
        }
        else{
            this.sourcePopup = null;
        }
        if(this.narrativeTimer > 0){
            this.narrativeTimer = Math.max(0, this.narrativeTimer - frametime);
        }
        else if(this.narrativeQueue.length){
            this.activeNarrative = this.narrativeQueue.shift();
            this.narrativeTimer = 6.5;
        }
        else{
            this.activeNarrative = null;
        }
    }

    updateActors(frametime){
        for(let actor of this.actors){
            actor.update(this, frametime);
        }
        this.actors = this.actors.filter((actor)=> !actor.remove);
    }

    spawnActors(frametime){
        this.spawnTimer -= frametime;
        if(this.spawnTimer > 0 || !this.stage) return;
        const stage = this.stage;
        const useObstacle = (stage.obstacles || []).length > 0 && Math.random() < 0.58;
        const source = useObstacle ? stage.obstacles : stage.collectibles;
        if(!source.length) return;
        const data = source[Math.floor(Math.random() * source.length)];
        const actorKind = useObstacle ? "obstacle" : "collectible";
        const iconOnly = actorKind == "collectible" && ICON_ONLY_COLLECTIBLES[data.label];
        let actorSize;
        let y;
        let actorData = data;
        if(actorKind == "obstacle"){
            const lane = Math.random() < 0.42 ? "slide" : "jump";
            actorSize = lane == "slide" ? new Vector(9.4, 3.2) : new Vector(7.8, 4.4);
            y = lane == "slide"
                ? this.height - GroundLevel - actorSize.y - 2.65
                : this.height - GroundLevel - actorSize.y;
            actorData = {
                ...data,
                lane,
                actionHint: lane == "slide" ? "SLIDE" : "JUMP"
            };
        }
        else{
            actorSize = iconOnly ? new Vector(4.2, 4.2) : new Vector(8.4, 3.8);
            y = randomrange(Math.floor(this.height - GroundLevel - 12), Math.floor(this.height - GroundLevel - 8));
        }
        const speed = actorKind == "obstacle" ? -8.8 : -7.8;
        this.actors.push(new HistoricalActor(actorKind, actorData, new Vector(this.width + 4, y), actorSize, speed));
        this.spawnTimer = randomrange(30, 52) / 10;
    }

    spawnEventBox(event){
        const lane = eventLane(event);
        const size = lane == "slide" ? new Vector(12.4, 4.7) : new Vector(11.2, 5.2);
        const y = lane == "slide"
            ? this.height - GroundLevel - size.y - 2.35
            : this.height - GroundLevel - size.y;
        const eventX = DEBUG_FAST_TIMELINE ? this.width * 0.18 : this.width * 0.4;
        const eventSpeed = DEBUG_FAST_TIMELINE ? -180 : -10;
        const laneEvent = {
            ...event,
            lane,
            actionHint: lane == "slide" ? "SLIDE" : "JUMP"
        };
        this.actors.push(new HistoricalActor("event", laneEvent, new Vector(eventX, y), size, eventSpeed));
    }

    checkTimelineEvents(){
        const stage = this.stage;
        if(!stage || this.state != "playing") return;
        for(let narrative of stage.narratives || []){
            const id = `${stage.key}:narrative:${narrative.time}`;
            if(!this.narrativesShown.has(id) && this.stageTime >= narrative.time){
                this.narrativesShown.add(id);
                this.queueNarrative(narrative.text, narrative.factIds);
            }
        }
        for(let news of stage.news || []){
            const id = `${stage.key}:news:${news.time}`;
            if(!this.newsShown.has(id) && this.stageTime >= news.time){
                this.newsShown.add(id);
                this.showNews(news.text, news.factIds);
            }
        }
        for(let event of stage.events || []){
            const id = `${stage.key}:event:${event.label}:${event.time}`;
            if(!this.eventsSpawned.has(id) && this.stageTime >= event.time){
                this.eventsSpawned.add(id);
                this.spawnEventBox(event);
            }
        }
        for(let choiceId of stage.choices || []){
            const choice = CHOICES_BY_ID[choiceId];
            if(choice && !this.choicesShown.has(choice.id) && this.stageTime >= choice.time){
                this.triggerChoice(choice);
                break;
            }
        }
    }

    advanceStageIfNeeded(){
        if(this.state != "playing") return;
        while(this.stage && this.stageTime >= this.stage.duration){
            this.stageTime -= this.stage.duration;
            if(this.stageIndex >= APUSH_CONTENT.stages.length - 1){
                this.completeJourney();
                return;
            }
            this.enterStage(this.stageIndex + 1);
        }
    }

    queueNarrative(text, factIds = []){
        this.markFacts(factIds);
        this.narrativeQueue.push({ text });
    }

    showNews(text, factIds = []){
        this.markFacts(factIds);
        this.newsMessage = text;
        this.newsTimer = 8;
    }

    triggerEvent(event){
        this.markFacts(event.factIds);
        this.queueNarrative(event.description, event.factIds);
        if(event.miniGame){
            this.triggerChoice(event.miniGame);
        }
    }

    collect(actor){
        this.markFacts(actor.data.factIds);
        if(actor.data.mysteryGame){
            this.triggerMiniGame(actor.data.mysteryGame);
            return;
        }
        this.applyResourceEffect(actor.data.effect, actor.data.label);
        this.lastResourceNote = `${actor.data.label}: ${formatEffect(actor.data.effect)}`;
        this.noteTimer = 2.2;
        this.showSourcePopup(sourcePopupFor(actor.data));
    }

    hitObstacle(actor){
        this.markFacts(actor.data.factIds);
        this.applyResourceEffect(actor.data.effect, actor.data.label);
        this.invulnerability = 1.35;
        this.lastResourceNote = `${actor.data.label}: ${formatEffect(actor.data.effect)}`;
        this.noteTimer = 2.6;
        this.checkHardship();
    }

    applyEraPressure(frametime){
        const pressure = pressureForStage(this.stage);
        for(let key of VISIBLE_RESOURCE_ORDER){
            if(pressure[key]){
                this.resources[key] = clamp(this.resources[key] + pressure[key] * frametime, 0, RESOURCE_MAX);
            }
        }
    }

    applyResourceEffect(effect = {}){
        for(let key of RESOURCE_ORDER){
            if(effect[key]){
                const max = key == "readiness" ? READINESS_MAX : RESOURCE_MAX;
                this.resources[key] = clamp(this.resources[key] + effect[key], 0, max);
            }
        }
    }

    triggerChoice(choice){
        this.state = "choice";
        this.currentChoice = choice;
        this.choiceResult = null;
        this.pendingHardship = false;
        this.choicesShown.add(choice.id);
        this.markFacts(choice.factIds);
    }

    triggerMiniGame(miniGameId){
        const miniGame = SPECIAL_MINIGAMES[miniGameId];
        if(!miniGame) return;
        this.state = "mini";
        this.currentMiniGame = miniGame;
        this.miniResult = null;
        this.pendingHardship = false;
        this.markFacts(miniGame.factIds);
        this.showSourcePopup(miniGameId == "new-deal-wheel" ? SOURCE_POPUPS.newDeal : SOURCE_POPUPS.homeFront);
    }

    playMiniGame(optionIndex = null){
        if(!this.currentMiniGame || this.miniResult) return;
        let result;
        if(this.currentMiniGame.type == "wheel"){
            const outcomes = this.currentMiniGame.outcomes;
            result = outcomes[Math.floor(Math.random() * outcomes.length)];
        }
        else{
            result = this.currentMiniGame.options[optionIndex];
        }
        if(!result) return;
        this.applyResourceEffect(result.effect);
        this.markFacts(result.factIds);
        this.miniResult = {
            label: result.label,
            explanation: result.explanation,
            effect: formatEffect(result.effect),
            factIds: result.factIds || []
        };
        this.lastResourceNote = `${result.label}: ${formatEffect(result.effect)}`;
        this.noteTimer = 2.6;
        this.pendingHardship = this.hasHardship();
    }

    resumeFromMiniGame(){
        this.currentMiniGame = null;
        this.miniResult = null;
        if(this.pendingHardship || this.hasHardship()){
            this.showHardship();
        }
        else{
            this.state = "playing";
        }
    }

    chooseOption(optionIndex){
        if(!this.currentChoice || this.choiceResult) return;
        const option = this.currentChoice.options[optionIndex];
        this.applyResourceEffect(option.effect);
        this.markFacts(option.factIds);
        this.choiceResult = {
            label: option.label,
            consequence: option.consequence,
            effect: formatEffect(option.effect)
        };
        this.pendingHardship = this.hasHardship();
    }

    resumeFromChoice(){
        this.currentChoice = null;
        this.choiceResult = null;
        if(this.pendingHardship || this.hasHardship()){
            this.showHardship();
        }
        else{
            this.state = "playing";
        }
    }

    showSourcePopup(popup){
        if(!popup) return;
        this.sourcePopup = popup;
        this.sourceTimer = 7.5;
    }

    hasHardship(){
        return this.resources.money <= 0 || this.resources.food <= 0 || this.resources.hope <= 0;
    }

    checkHardship(){
        if(this.hasHardship()){
            this.showHardship();
        }
    }

    showHardship(){
        this.state = "hardship";
        this.actors = [];
    }

    completeJourney(){
        this.state = "complete";
        this.elapsed = TOTAL_DURATION;
        this.stageTime = this.stage ? this.stage.duration : 0;
        this.actors = [];
    }

    getEncounteredFacts(){
        return FACTS.filter((fact)=> this.encounteredFacts.has(fact.id));
    }

    static newgame(){
        return new Game(
            width,
            height,
            scale,
            new Player(new Vector(0, 0), new Vector(7.5, height - Player.prototype.size.y - GroundLevel)),
            Display
        );
    }
}

class GameRunner{
    constructor(keys){
        this.keys = keys;
        this.lasttime = null;
        this.game = Game.newgame();
        this.olddisplay = this.game.display;
        this.bindControls();
        this.run();
        respnosive(this, true);
    }

    bindControls(){
        this.game.display.onStart = ()=>{
            this.game.startJourney();
        };
        this.game.display.onRestart = ()=>{
            this.restart();
        };
        this.game.display.onChoice = (index)=>{
            this.game.chooseOption(index);
        };
        this.game.display.onContinueChoice = ()=>{
            this.game.resumeFromChoice();
        };
        this.game.display.onMiniGame = (index)=>{
            this.game.playMiniGame(index);
        };
        this.game.display.onContinueMini = ()=>{
            this.game.resumeFromMiniGame();
        };
        window.addEventListener("keydown", (e)=>{
            if((e.key === "Enter" || e.key === " ") && this.game.state == "start"){
                this.game.startJourney();
            }
            if(e.key === "?" || (e.key === "/" && e.shiftKey)){
                this.game.display.toggleHelp();
                e.preventDefault();
            }
        });
    }

    restart(){
        this.olddisplay.clear();
        this.game = Game.newgame();
        this.olddisplay = this.game.display;
        this.bindControls();
        respnosive(this, true);
    }

    run(time){
        if(this.lasttime){
            let frametime = Math.min(time - this.lasttime, 50) / 1000;
            this.game.update(frametime, this.keys);
        }
        this.lasttime = time;
        requestAnimationFrame((newtime)=>{ this.run(newtime); });
    }
}

class Display{
    constructor(game){
        this.game = game;
        this.frame = makeelment("main", { "class": "game stage-city", "style": `width:${game.width * game.scale}px;height:${game.height * game.scale}px` });
        this.hud = makeelment("section", { "class": "hud" });
        this.resourceWrap = makeelment("div", { "class": "resources" });
        this.timeline = makeelment("div", { "class": "timeline-wrap" });
        this.props = makeelment("div", { "class": "stage-props" });
        this.actors = makeelment("div", { "class": "actor-layer" });
        this.playerLayer = makeelment("div", { "class": "player-layer" });
        this.toast = makeelment("div", { "class": "narrative-toast" });
        this.news = makeelment("div", { "class": "news-messenger" });
        this.note = makeelment("div", { "class": "resource-note" });
        this.source = makeelment("aside", { "class": "source-popup" });
        this.helpButton = makeelment("button", { "class": "help-button", "type": "button", "aria-label": "Show controls", "text": "?" });
        this.helpPanel = makeelment("aside", { "class": "help-panel" });
        this.overlay = makeelment("section", { "class": "overlay" });
        this.hud.appendChild(this.timeline);
        this.hud.appendChild(this.resourceWrap);
        this.frame.appendChild(this.props);
        this.frame.appendChild(this.actors);
        this.frame.appendChild(this.playerLayer);
        this.frame.appendChild(this.hud);
        this.frame.appendChild(this.toast);
        this.frame.appendChild(this.news);
        this.frame.appendChild(this.note);
        this.frame.appendChild(this.source);
        this.frame.appendChild(this.helpButton);
        this.frame.appendChild(this.helpPanel);
        this.frame.appendChild(this.overlay);
        document.body.appendChild(this.frame);
        this.overlaySignature = "";
        this.lastStageKey = "";
        this.helpPanel.innerHTML = `
            <h3>Controls</h3>
            <p><strong>Jump:</strong> Arrow Up or Space.</p>
            <p><strong>Slide:</strong> Arrow Down or S while on the ground.</p>
            <p><strong>Event boxes:</strong> hit one to open its two-option choice. Low boxes can be jumped over; high boxes can be slid under.</p>
            <p><strong>Goal:</strong> collect resource icons and survive the timeline to 1945.</p>
        `;
        this.helpButton.addEventListener("click", ()=> this.toggleHelp());
    }

    toggleHelp(){
        this.helpPanel.classList.toggle("show");
    }

    sync(newgame){
        this.game = newgame;
        this.frame.setAttribute("class", `game stage-${newgame.stage ? newgame.stage.visual : "sunrise"} state-${newgame.state}`);
        this.drawHUD(newgame);
        this.drawStageProps(newgame);
        this.drawActors(newgame);
        this.drawMessages(newgame);
        this.drawOverlay(newgame);
    }

    drawHUD(game){
        const stage = game.stage;
        this.timeline.innerHTML = `
            <div class="year-line">
                <span class="year-now">${game.yearLabel}</span>
                <span class="stage-label">${stage ? stage.label : "Journey Complete"}</span>
                <span class="year-end">1929 -> 1945</span>
            </div>
            <div class="timeline-track"><div class="timeline-fill" style="width:${game.totalProgress}%"></div></div>
        `;
        this.resourceWrap.innerHTML = VISIBLE_RESOURCE_ORDER.map((key)=>{
            const value = game.resources[key];
            return `
                <div class="meter meter-${key}">
                    <div class="meter-top"><span>${RESOURCE_LABELS[key]}</span><strong>${Math.round(value)}</strong></div>
                    <div class="meter-track"><div class="meter-fill" style="width:${value}%"></div></div>
                </div>
            `;
        }).join("");
    }

    drawStageProps(game){
        const stage = game.stage;
        if(!stage || this.lastStageKey == stage.key) return;
        this.lastStageKey = stage.key;
        this.props.innerHTML = stage.props.map((label, index)=> `<div class="stage-prop prop-${index + 1}">${label}</div>`).join("");
    }

    drawActors(game){
        this.actors.innerHTML = "";
        for(let actor of game.actors){
            const iconClass = actor.kind == "collectible" ? ICON_ONLY_COLLECTIBLES[actor.data.label] : "";
            let actorChildren;
            if(actor.kind == "event"){
                actorChildren = [
                    makeelment("span", { "class": `event-icon event-icon-${actor.data.icon || "document"}`, "aria-label": actor.data.label }),
                    makeelment("span", { "class": "event-label", "text": actor.data.label })
                ];
            }
            else{
                actorChildren = iconClass
                    ? [makeelment("span", { "class": `collectible-icon icon-${iconClass}`, "aria-label": actor.data.label })]
                    : [makeelment("span", { "text": actor.data.label })];
            }
            const element = makeelment("div", {
                "class": `actor ${actor.kind} ${actor.data.lane ? `lane-${actor.data.lane}` : ""} ${iconClass ? "icon-only" : ""}`,
                "data-action-hint": actor.data.actionHint || "EVENT",
                "style": `top:${actor.postionVector.y * game.scale}px;left:${actor.postionVector.x * game.scale}px;width:${actor.size.x * game.scale}px;height:${actor.size.y * game.scale}px`
            }, actorChildren);
            this.actors.appendChild(element);
        }
        this.playerLayer.innerHTML = "";
        const playerHeight = game.player.size.y * game.scale;
        const playerVisualWidth = playerHeight;
        const visualScaleY = game.player.isSliding ? 1.15 : drawingscale;
        const visualScaleX = game.player.isSliding ? drawingscale * 1.14 : drawingscale;
        const playerTop = (game.player.postionVector.y * game.scale) - (playerHeight * (visualScaleY - 1));
        const playerLeft = (game.player.postionVector.x * game.scale) - ((playerVisualWidth - (game.player.size.x * game.scale)) / 2);
        const player = makeelment("div", {
            "class": `actor player ${game.player.state} ${game.invulnerability > 0 ? "recovering" : ""}`,
            "style": `top:${playerTop}px;left:${playerLeft}px;width:${playerVisualWidth}px;height:${playerHeight}px;transform:scale(${visualScaleX}, ${visualScaleY});`
        });
        game.player.frames.update(player, game.player.state, playerVisualWidth, playerHeight);
        this.playerLayer.appendChild(player);
    }

    drawMessages(game){
        if(game.activeNarrative){
            this.toast.textContent = game.activeNarrative.text;
            this.toast.classList.add("show");
        }
        else{
            this.toast.classList.remove("show");
        }
        if(game.newsMessage){
            this.news.textContent = game.newsMessage;
            this.news.classList.add("show");
        }
        else{
            this.news.classList.remove("show");
        }
        if(game.noteTimer > 0 && game.lastResourceNote){
            this.note.textContent = game.lastResourceNote;
            this.note.classList.add("show");
        }
        else{
            this.note.classList.remove("show");
        }
        if(game.sourcePopup){
            const popup = game.sourcePopup;
            this.source.innerHTML = `
                <p class="source-kicker">${escapeHtml(popup.title)}</p>
                <p>${escapeHtml(popup.excerpt)}</p>
                <a href="${escapeHtml(popup.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(popup.source)}</a>
            `;
            this.source.classList.add("show");
        }
        else{
            this.source.classList.remove("show");
        }
    }

    drawOverlay(game){
        const signature = `${game.state}:${game.currentChoice ? game.currentChoice.id : ""}:${game.choiceResult ? game.choiceResult.label : ""}:${game.currentMiniGame ? game.currentMiniGame.id : ""}:${game.miniResult ? game.miniResult.label : ""}:${game.encounteredFacts.size}`;
        if(signature == this.overlaySignature) return;
        this.overlaySignature = signature;
        this.overlay.className = `overlay ${game.state == "playing" ? "" : "show"}`;
        if(game.state == "start"){
            this.overlay.innerHTML = `
                <div class="screen-card start-card">
                    <p class="kicker">APUSH choice-and-consequence runner</p>
                    <h1>The Long Road: 1929–1945</h1>
                    <p>Reach historical event boxes to make two-option choices, collect resource icons, and move year by year from the Great Depression through World War II.</p>
                    <p class="start-controls">Jump with Arrow Up or Space. Slide with Arrow Down or S. Use the ? button anytime for controls.</p>
                    <button class="primary-action" data-action="start">Begin Journey</button>
                </div>
            `;
            this.overlay.querySelector("[data-action='start']").addEventListener("click", ()=> this.onStart());
        }
        else if(game.state == "choice"){
            this.drawChoice(game);
        }
        else if(game.state == "mini"){
            this.drawMiniGame(game);
        }
        else if(game.state == "hardship"){
            this.overlay.innerHTML = `
                <div class="screen-card hardship-card">
                    <p class="kicker">Hardship Ending</p>
                    <h2>The road becomes too difficult.</h2>
                    <p>Your family could not make it through these years without severe loss. Millions of Americans faced impossible choices during the Great Depression.</p>
                    <div class="summary-meters">${this.renderSummaryMeters(game)}</div>
                    <button class="primary-action" data-action="restart">Restart Journey</button>
                </div>
            `;
            this.overlay.querySelector("[data-action='restart']").addEventListener("click", ()=> this.onRestart());
        }
        else if(game.state == "complete"){
            this.drawEnding(game);
        }
        else{
            this.overlay.innerHTML = "";
        }
    }

    choiceMode(choice, includeScrollCue = false){
        const base = (choice.mode || "Decision Point").replace(/^Mini-Game:\s*/i, "Choice: ");
        return includeScrollCue ? `${base} (Scroll Down)` : base;
    }

    drawChoice(game){
        const choice = game.currentChoice;
        if(!choice) return;
        if(!game.choiceResult){
            this.overlay.innerHTML = `
                <div class="screen-card choice-card">
                    <p class="kicker">${this.choiceMode(choice, true)}</p>
                    <h2>${choice.prompt}</h2>
                    ${choice.context ? `<p class="choice-context">${choice.context}</p>` : ""}
                    ${this.renderChoiceVisual(choice)}
                    ${choice.instructions ? `<p class="choice-instructions">${choice.instructions}</p>` : ""}
                    <div class="choice-actions">
                        ${choice.options.map((option, index)=> `
                            <button class="choice-button" data-choice="${index}">
                                <strong>${option.label}</strong>
                                <span>${formatEffect(option.effect)}</span>
                            </button>
                        `).join("")}
                    </div>
                </div>
            `;
            for(let button of this.overlay.querySelectorAll("[data-choice]")){
                button.addEventListener("click", ()=> this.onChoice(Number(button.dataset.choice)));
            }
        }
        else{
            this.overlay.innerHTML = `
                <div class="screen-card choice-card">
                    <p class="kicker">Consequence</p>
                    <h2>${game.choiceResult.label}</h2>
                    <p>${game.choiceResult.consequence}</p>
                    <p class="effect-line">${game.choiceResult.effect}</p>
                    <button class="primary-action" data-action="continue">Continue</button>
                </div>
            `;
            this.overlay.querySelector("[data-action='continue']").addEventListener("click", ()=> this.onContinueChoice());
        }
    }

    drawMiniGame(game){
        const miniGame = game.currentMiniGame;
        if(!miniGame) return;
        if(!game.miniResult){
            const actionContent = miniGame.type == "wheel"
                ? `
                    <div class="program-wheel" aria-label="New Deal program wheel">
                        ${miniGame.outcomes.map((outcome, index)=> `<span style="--i:${index};--n:${miniGame.outcomes.length}">${outcome.label}</span>`).join("")}
                    </div>
                    <button class="primary-action" data-mini-spin>Spin Wheel</button>
                `
                : `
                    <div class="mini-options">
                        ${miniGame.options.map((option, index)=> `
                            <button class="mini-option" data-mini-choice="${index}">
                                <strong>${option.label}</strong>
                                <span>${formatEffect(option.effect)}</span>
                            </button>
                        `).join("")}
                    </div>
                `;
            this.overlay.innerHTML = `
                <div class="screen-card mini-card">
                    <p class="kicker">${miniGame.kicker}</p>
                    <h2>${miniGame.title}</h2>
                    <p class="choice-context">${miniGame.context}</p>
                    <h3>${miniGame.prompt}</h3>
                    ${actionContent}
                </div>
            `;
            const spinButton = this.overlay.querySelector("[data-mini-spin]");
            if(spinButton) spinButton.addEventListener("click", ()=> this.onMiniGame());
            for(let button of this.overlay.querySelectorAll("[data-mini-choice]")){
                button.addEventListener("click", ()=> this.onMiniGame(Number(button.dataset.miniChoice)));
            }
        }
        else{
            this.overlay.innerHTML = `
                <div class="screen-card mini-card">
                    <p class="kicker">Mini Game Result</p>
                    <h2>${game.miniResult.label}</h2>
                    <p>${game.miniResult.explanation}</p>
                    <p class="effect-line">${game.miniResult.effect}</p>
                    <button class="primary-action" data-action="continue-mini">Continue</button>
                </div>
            `;
            this.overlay.querySelector("[data-action='continue-mini']").addEventListener("click", ()=> this.onContinueMini());
        }
    }

    renderChoiceVisual(choice){
        const image = choice.image || historicalImageFor(choice.factIds, choice.prompt);
        return `
            <figure class="choice-visual">
                <img class="choice-photo" src="${image.src}" alt="${image.alt}">
                <span class="choice-visual-stamp">${this.choiceMode(choice)}</span>
            </figure>
        `;
    }

    drawEnding(game){
        const facts = game.getEncounteredFacts();
        const isolationNote = game.resources.readiness < 40
            ? `<p class="ending-note">Your choices reflected strong isolationist instincts. Many Americans felt the same before Pearl Harbor.</p>`
            : "";
        this.overlay.innerHTML = `
            <div class="screen-card ending-card">
                <p class="kicker">Journey Complete</p>
                <h2>Journey Complete: 1929–1945</h2>
                <div class="summary-meters">${this.renderSummaryMeters(game)}</div>
                ${isolationNote}
                <div class="takeaways">
                    <h3>APUSH Takeaways</h3>
                    <ol>
                        <li>The Great Depression began after the 1929 stock market crash but was worsened by bank failures, unemployment, falling demand, and weak relief systems.</li>
                        <li>The New Deal expanded the role of the federal government through relief, recovery, and reform.</li>
                        <li>Programs like the CCC, WPA, PWA, TVA, FDIC, Social Security, and Wagner Act tried to provide jobs, stability, and worker protections.</li>
                        <li>Environmental disaster and farm debt pushed many families to migrate, especially from the Great Plains.</li>
                        <li>The U.S. entered WWII gradually: neutrality debates, defense production, Lend-Lease, Pearl Harbor, and then formal war.</li>
                        <li>Wartime production and military mobilization created jobs and helped end Depression-era unemployment.</li>
                        <li>The period transformed the relationship between citizens, the federal government, and the economy.</li>
                    </ol>
                    <p>The dry farm/migration stage represented the Dust Bowl and its effects.</p>
                    <p>War work created opportunities, but sacrifice, discrimination, incarceration, and inequality shaped the era too.</p>
                </div>
                <div class="facts-panel">
                    <h3>Historical Facts Encountered</h3>
                    <p>You encountered ${facts.length} APUSH events, policies, and developments.</p>
                    <ol>
                        ${facts.map((fact)=> `<li><strong>${fact.year}:</strong> ${fact.label}</li>`).join("")}
                    </ol>
                </div>
                <button class="primary-action" data-action="restart">Restart Journey</button>
            </div>
        `;
        this.overlay.querySelector("[data-action='restart']").addEventListener("click", ()=> this.onRestart());
    }

    renderSummaryMeters(game){
        return VISIBLE_RESOURCE_ORDER.map((key)=> `
            <div class="summary-meter">
                <span>${RESOURCE_LABELS[key]}</span>
                <strong>${Math.round(game.resources[key])}</strong>
            </div>
        `).join("");
    }

    clear(){
        this.frame.remove();
    }
}

let game = new GameRunner(keys);

function respnosive(game, smouth){
    if(!game.olddisplay || !game.olddisplay.frame) return;
    if(smouth) game.olddisplay.frame.style.transition = "transform 0.25s ease";
    else game.olddisplay.frame.style.transition = "";
    const baseWidth = scale * width;
    const baseHeight = scale * height;
    const viewportWidth = document.documentElement.clientWidth * 0.94;
    const viewportHeight = document.documentElement.clientHeight * 0.9;
    const scaleX = Math.min(2.2, viewportWidth / baseWidth, viewportHeight / baseHeight);
    game.olddisplay.frame.style.transform = `scale(${scaleX})`;
}

window.addEventListener("resize", ()=>{
    respnosive(game, true);
});
