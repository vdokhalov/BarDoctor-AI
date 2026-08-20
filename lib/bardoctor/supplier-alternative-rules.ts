export type SupplierWebSource = {
  url: string;
  title: string;
};

const PROCUREMENT_TOKEN_ROOTS = [
  "coca", "cola", "кока", "кола", "pepsi", "пепси", "sprite", "спрайт", "fanta", "фанта",
  "schwepp", "швеп", "вода", "water", "сок", "juice", "нектар", "энерг", "пиво", "beer", "bier",
  "сидр", "cider", "вино", "wine", "игрист", "champagne", "шампан", "prosecco", "просекко", "водк",
  "vodka", "виски", "whisk", "коньяк", "cognac", "бренди", "brandy", "джин", "текил", "tequila",
  "ликер", "ликёр", "liqueur", "вермут", "vermouth", "ром", "rum", "сироп", "syrup",
] as const;

const GENERIC_PRODUCT_TOKENS = new Set([
  "вино", "wine", "vin", "пиво", "beer", "bier", "водка", "vodka", "виски", "whisky", "whiskey",
  "коньяк", "cognac", "ром", "rum", "джин", "gin", "текила", "tequila", "ликер", "ликёр", "liqueur",
  "напиток", "drink", "белое", "белый", "white", "красное", "красный", "red", "сухое", "сухой", "dry",
  "полусладкое", "sweet", "игристое", "sparkling", "бутылка", "bottle", "банка", "can",
]);

const PRODUCT_TOKEN_ALIASES: Record<string, string> = {
  кока: "coca", кола: "cola", спрайт: "sprite", фанта: "fanta", швепс: "schweppes", швеп: "schweppes",
  мартини: "martini", финляндия: "finlandia", апероль: "aperol", бакарди: "bacardi", баллантайнс: "ballantines",
  джеймсон: "jameson", хеннесси: "hennessy", чивас: "chivas", абсолют: "absolut", белуга: "beluga",
  ягермейстер: "jagermeister", редбулл: "redbull", сок: "juice", вода: "water", пиво: "beer",
};

const PRODUCT_VARIANT_TOKENS = new Set([
  "zero", "light", "diet", "cherry", "vanilla", "lime", "lemon", "mango", "peach", "berry",
  "без", "сахара", "лайт", "зеро", "вишня", "ваниль", "лайм", "лимон", "манго", "персик",
  "manifest", "fiero", "rosso", "rosato", "extra", "reserve", "black", "gold", "silver",
]);

const FORBIDDEN_SOURCE_WORDS = /(?:ночн(?:ой|ого)\s+клуб|night\s*club|restaurant|ресторан|кафе|karaoke|караоке|lounge|меню\s+(?:бара|клуба|ресторана)|bar\s+menu|drink\s+menu|booking|reservation)/i;

export function normalSupplierTargetKey(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/gi, " ").trim();
}

export function isPackagedProcurementItem(value: string): boolean {
  const tokens = normalSupplierTargetKey(value).split(" ").filter(Boolean);
  return tokens.some(token => token === "7up" || token === "apa" || token === "gin" || token === "burn" || token === "redbull"
    || PROCUREMENT_TOKEN_ROOTS.some(root => token === root || token.startsWith(root)));
}

function productTokens(value: string): string[] {
  return normalSupplierTargetKey(value).split(" ")
    .filter(token => token.length > 2 && !/^\d/.test(token) && !GENERIC_PRODUCT_TOKENS.has(token))
    .map(token => PRODUCT_TOKEN_ALIASES[token] ?? token);
}

function variantTokens(value: string): string[] {
  return productTokens(value).filter(token => PRODUCT_VARIANT_TOKENS.has(token));
}

export function isSameSupplierMenuProduct(target: string, candidate: string): boolean {
  const required = productTokens(target);
  const candidateTokens = new Set(productTokens(candidate));
  const targetVariants = new Set(variantTokens(target));
  const candidateVariants = variantTokens(candidate);
  return required.length > 0
    && required.every(token => candidateTokens.has(token))
    && candidateVariants.every(token => targetVariants.has(token));
}

export function isSupplierProcurementSource(urls: string[], sources: SupplierWebSource[]): boolean {
  const byUrl = new Map(sources.map(source => [source.url, `${source.title} ${source.url}`]));
  const primary = byUrl.get(urls[0]) ?? urls[0] ?? "";
  return Boolean(primary) && !FORBIDDEN_SOURCE_WORDS.test(primary);
}

export function supplierTargetSignature(targetNames: string[]): string {
  return targetNames.map(normalSupplierTargetKey).filter(Boolean).sort().join("|");
}
