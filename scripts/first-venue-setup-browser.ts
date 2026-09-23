import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, type Page } from 'playwright-core';
import browserRuntime from './browser-runtime.cjs';
import { setupServer } from '../tests/helpers/setup-server';
const server = await setupServer({ bootstrapDelayMs: 1200 }), out = 'outputs/setup';
fs.mkdirSync(out, { recursive: true });
const executablePath = process.env.BD_QA_BROWSER || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : await browserRuntime.resolveBrowserExecutable(chromium.executablePath()));
const browser = await chromium.launch({ executablePath, headless: true });
const results = [];
const password = 'Setup-Isolated-123!';
async function registration(page: Page, email: string) {
    const blockedNavigations: string[] = [];
    const dismissRegistrationDialog = async (dialog: import('playwright-core').Dialog) => { blockedNavigations.push(dialog.type()); await dialog.dismiss(); };
    page.on('dialog', dismissRegistrationDialog);
    await page.goto(server.base + '/register');
    await page.getByPlaceholder('Алексей').fill('Setup Test');
    await page.locator('input[type=email]').fill(email);
    await page.getByPlaceholder('Минимум 6 символов').fill(password);
    await page.getByPlaceholder('Повторите пароль').fill(password);
    await page.getByRole('checkbox').click();
    await page.getByRole('button', { name: 'Создать аккаунт', exact: true }).click();
    await page.waitForURL('**/setup*', { timeout: 10000 });
    page.off('dialog', dismissRegistrationDialog);
    assert.deepEqual(blockedNavigations, [], 'Registration must navigate to setup without an unsaved-changes prompt');
    await page.getByRole('button', { name: 'Начать', exact: true }).click();
    await page.getByRole('textbox', { name: 'Название заведения', exact: true }).waitFor();
}
async function loginToUnfinishedSetup(email: string, width: number) {
    const context = await browser.newContext({ viewport: { width, height: 850 }, isMobile: width < 600, hasTouch: width < 600 });
    try {
        const page = await context.newPage();
        const dialogs: string[] = [];
        page.on('dialog', async dialog => { dialogs.push(dialog.type()); await dialog.dismiss(); });
        await page.goto(server.base + '/login');
        await page.locator('input[type=email]').fill(email);
        await page.locator('input[type=password]').fill(password);
        const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/login');
        await page.getByRole('button', { name: 'Войти', exact: true }).click();
        assert.equal((await response).status(), 200);
        await page.waitForURL('**/setup*', { timeout: 10000 });
        await page.getByRole('button', { name: 'Начать', exact: true }).waitFor();
        assert.deepEqual(dialogs, [], 'Successful login must navigate without an unsaved-changes prompt');
    } finally {
        await context.close();
    }
}async function api(page: Page, url: string) { for (let attempt = 0; attempt < 3; attempt++) {
    try {
        return await page.evaluate(async (url) => { const r = await fetch(url, { headers: { 'X-Session-Email': localStorage.getItem('bd_session') || '', 'X-Session-Token': localStorage.getItem('bd_session_token') || '', 'X-Venue-Id': localStorage.getItem('bd_active_venue_id') || '' }, cache: 'no-store' }); return { status: r.status, data: await r.json() as {
                restaurant: {
                    name: string;
                    region: string;
                    city: string;
                    seats: number;
                    openTime: string; closeTime: string; workingDays?: Record<string,boolean>;
                } | null;
                venues: unknown[];
            } }; }, url);
    }
    catch (error) {
        if (attempt === 2 || !String(error).includes('Execution context was destroyed'))
            throw error;
        await page.waitForLoadState('load');
    }
} throw new Error('Navigation did not settle'); }
try {
    for (const width of (process.env.BD_SETUP_WIDTHS ? process.env.BD_SETUP_WIDTHS.split(',').map(Number) : [1280, 390, 412])) {
        const context = await browser.newContext({ viewport: { width, height: 850 }, isMobile: width < 600, hasTouch: width < 600 });
        const page = await context.newPage(), errors: string[] = [];
        page.on('pageerror', e => errors.push(e.message));
        console.log('Setup viewport', width);
        const email = 'setup-' + width + '@isolated.test', name = 'Мастер ' + width;
        await registration(page, email);
        await loginToUnfinishedSetup(email, width);
        await page.screenshot({ path: out + '/' + width + '-initial.png' });
        // Behavioral regression: the committed v443 launch node intercepts this click.
        await page.getByRole('button', { name: 'Выберите страну', exact: true }).click({ timeout: 5000 });
        await page.getByRole('button', { name: /Молдова/ }).click();
        await page.getByRole('textbox', { name: 'Название заведения', exact: true }).fill(name);
        await page.getByRole('button', { name: 'Бар', exact: true }).click();
        await page.getByRole('textbox', { name: 'Регион или район', exact: true }).fill('Тестовый регион');
        await page.getByRole('button', { name: 'Выберите город', exact: true }).click();
        await page.getByRole('button', { name: 'Тирасполь', exact: true }).click();
        await page.getByRole('button', { name: 'Выберите валюту', exact: true }).click();
        await page.getByRole('button', { name: 'MDL — молдавский лей', exact: true }).click();
        await page.locator('[style*="78dvh"]').waitFor({ state: 'detached' });
        const layout = await page.locator('[data-bd-setup-scroll]').evaluate(e => ({ height: e.clientHeight, contentHeight: e.scrollHeight }));
        const next = page.getByRole('button', { name: 'Далее', exact: true });
        assert.equal(await next.isEnabled(), true);
        const box = await next.boundingBox();
        assert.ok(box && box.y >= 0 && box.y + box.height <= 850);
        await page.screenshot({ path: out + '/' + width + '-step1.png' });
        // Cold/missing venue metadata must wait for delayed real bootstrap, not assume ready.
        await page.evaluate(() => localStorage.removeItem('bd_venue_context__' + localStorage.getItem('bd_session')));
        await page.reload();
        assert.equal(await page.getByRole('textbox', { name: 'Название заведения', exact: true }).inputValue(), name);
        await next.click();
        await page.getByLabel('Мест в зале', { exact: true }).fill('42');
        for (const day of ['Пятница','Суббота','Воскресенье']) await page.locator('bd-venue-schedule').getByRole('button',{name:day}).click();
        await page.locator('bd-venue-schedule input[type=time]').nth(0).fill('22:00');
        await page.locator('bd-venue-schedule input[type=time]').nth(1).fill('06:00');
        assert.match(await page.locator('.bd-venue-schedule-summary').innerText(),/Пт, Сб, Вс · 22:00–06:00 следующего дня/);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true);
        await page.screenshot({path:out+'/'+width+'-schedule.png'});
        await page.getByRole('button', { name: 'Назад', exact: true }).click();
        await page.getByRole('textbox', { name: 'Название заведения', exact: true }).waitFor();
        assert.equal(await page.getByRole('textbox', { name: 'Название заведения', exact: true }).inputValue(), name);
        await next.click();
        await page.getByLabel('Мест в зале', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Мест в зале', { exact: true }).inputValue(), '42');
        assert.equal(await page.locator('bd-venue-schedule').getByRole('button',{name:'Воскресенье'}).getAttribute('aria-pressed'),'true');
        await next.click();
        await page.getByRole('heading').filter({ hasText: /Зоны/ }).waitFor();
        await next.click();
        await page.getByRole('heading').filter({ hasText: /Тип/ }).waitFor();
        await next.click();
        await page.getByRole('button', { name: 'Создать заведение', exact: true }).waitFor();
        server.failSave();
        await page.getByRole('button', { name: 'Создать заведение', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: 'Тест: сохранение' }).waitFor();
        assert.equal((await api(page, '/api/restaurants/me')).data.restaurant, null);
        await page.screenshot({ path: out + '/' + width + '-save-error.png' });
        const beforePosts = server.requests.filter(x => x.method === 'POST' && x.path.replace(/\/$/, '') === '/api/restaurants' && x.status === 200).length;
        await page.getByRole('button', { name: 'Создать заведение', exact: true }).dblclick();
        await page.waitForURL('**/home*');
        await page.waitForLoadState('domcontentloaded');
        await page.locator('[data-bd-home-page]').waitFor();
        const saved = await api(page, '/api/restaurants/me');
        assert.equal(saved.status, 200);
        assert.equal(saved.data.restaurant!.name, name);
        assert.equal(saved.data.restaurant!.region, 'Тестовый регион');
        assert.equal(saved.data.restaurant!.city, 'Тирасполь');
        assert.equal(saved.data.restaurant!.seats, 42);
        assert.equal(saved.data.restaurant!.openTime,'22:00');
        assert.equal(saved.data.restaurant!.closeTime,'06:00');
        assert.deepEqual([5,6,7].map(day=>saved.data.restaurant!.workingDays?.[String(day)]),[true,true,true]);
        assert.equal((await api(page, '/api/venues')).data.venues.length, 1);
        assert.equal(server.requests.filter(x => x.method === 'POST' && x.path.replace(/\/$/, '') === '/api/restaurants' && x.status === 200).length, beforePosts + 1);
        await page.reload();
        await page.waitForURL('**/home*');
        await page.waitForLoadState('domcontentloaded');
        await page.locator('[data-bd-home-page]').waitFor();
        assert.equal((await api(page, '/api/restaurants/me')).data.restaurant!.name, name);
        assert.equal((await api(page, '/api/restaurants/me')).data.restaurant!.workingDays?.['7'],true);
        await page.screenshot({ path: out + '/' + width + '-home.png' });
        await page.goto(server.base + '/profile');
        await page.locator('[data-bd-profile="profile-v282"]').waitFor();
        await page.locator('.bd-profile-venue-head-v280').click();
        await page.locator('[data-bd-profile-editor="venue-v282"] bd-venue-schedule').waitFor();
        await page.waitForFunction(() => { const editor = document.querySelector(".bd-profile-editor-v281"); return editor && getComputedStyle(editor).display === "flex"; });
        const editorSchedule=page.locator('[data-bd-profile-editor="venue-v282"] bd-venue-schedule');
        assert.equal(await editorSchedule.getByRole('button',{name:'Воскресенье'}).getAttribute('aria-pressed'),'true');
        await editorSchedule.getByRole('button',{name:'Четверг'}).click();
        await editorSchedule.locator('input[type=time]').nth(0).fill('21:00');
        await page.screenshot({path:out+'/'+width+'-profile-schedule.png'});
        server.failSave();
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.locator('[data-bd-profile-editor="venue-v282"] bd-venue-schedule').waitFor();
        assert.equal(await editorSchedule.getByRole('button',{name:'Четверг'}).getAttribute('aria-pressed'),'true');
        assert.equal((await api(page,'/api/restaurants/me')).data.restaurant!.openTime,'22:00');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.locator('[data-bd-profile="profile-v282"]').waitFor();
        const edited=(await api(page,'/api/restaurants/me')).data.restaurant!;
        assert.equal(edited.openTime,'21:00');
        assert.equal(edited.workingDays?.['4'],true);
        assert.equal(edited.workingDays?.['7'],true);
        await page.reload();
        await page.locator('[data-bd-profile="profile-v282"]').waitFor();
        await page.locator('.bd-profile-venue-head-v280').click();
        await page.locator('[data-bd-profile-editor="venue-v282"] bd-venue-schedule').waitFor();
        assert.equal(await page.locator('[data-bd-profile-editor="venue-v282"] bd-venue-schedule').getByRole('button',{name:'Четверг'}).getAttribute('aria-pressed'),'true');
        await page.screenshot({path:out+'/'+width+'-profile-schedule-reopen.png'});
        await page.locator('[data-bd-profile-editor="venue-v282"] bd-venue-schedule').getByRole('button',{name:'Вторник'}).click();
        await page.waitForFunction(() => { const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented; });
        let warningSeen=false;
        page.once('dialog',async dialog=>{warningSeen=true;await dialog.accept()});
        await page.goto(server.base+'/home');
        assert.equal(warningSeen,true);
        assert.equal((await api(page,'/api/restaurants/me')).data.restaurant!.workingDays?.['2'],false);
        await page.goto(server.base + '/settings');
        await page.getByRole('button', { name: 'Выйти из аккаунта', exact: true }).click();
        await page.waitForURL('**/login*');
        await page.waitForLoadState('load');
        await page.getByRole('button', { name: 'Войти', exact: true }).waitFor();
        await page.locator('input[type=email]').fill(email);
        await page.locator('input[type=password]').fill(password);
        await page.getByRole('button', { name: 'Войти', exact: true }).click();
        await page.waitForURL('**/home*');
        await page.waitForLoadState('domcontentloaded');
        await page.locator('[data-bd-home-page]').waitFor();
        assert.equal((await api(page, '/api/restaurants/me')).data.restaurant!.name, name);
        if (width === 1280) {
            server.failDirectory();
            await page.goto(server.base + '/venues/new');
            const venueForm = page.frameLocator('iframe[src*="/venues/new"]');
            await venueForm.locator('input[name=name]').fill('Дополнительное тестовое');
            await venueForm.locator('#venue-directory-retry').waitFor();
            assert.equal(await venueForm.locator('#create-venue-button').isDisabled(), true);
            await venueForm.locator('#venue-directory-retry').click();
            await venueForm.locator('#venue-country option[value="Молдова"]').waitFor({ state: 'attached' });
            assert.equal(await venueForm.locator('input[name=name]').inputValue(), 'Дополнительное тестовое');
            await venueForm.locator('input[name=businessType][value="Бар"]').locator('..').click();
            await venueForm.locator('#venue-country').selectOption('Молдова');
            await venueForm.locator('#venue-city').selectOption('Тирасполь');
            await venueForm.locator('select[name=currency]').selectOption('MDL');
            for(const day of ['Понедельник','Вторник','Среда','Четверг','Пятница']) await venueForm.locator('bd-venue-schedule').getByRole('button',{name:day}).click();
            await venueForm.locator('bd-venue-schedule input[type=time]').nth(0).fill('09:00');
            await venueForm.locator('bd-venue-schedule input[type=time]').nth(1).fill('18:00');
            await venueForm.locator('#create-venue-button').click();
            await page.waitForURL('**/home*');
            await page.locator('[data-bd-home-page]').waitFor();
            assert.equal((await api(page, '/api/venues')).data.venues.length, 2);
            assert.equal((await api(page, '/api/restaurants/me')).data.restaurant!.name, 'Дополнительное тестовое');
            const secondSchedule=(await api(page,'/api/restaurants/me')).data.restaurant!;
            assert.deepEqual([1,2,3,4,5,6,7].map(day=>secondSchedule.workingDays?.[String(day)]),[true,true,true,true,true,false,false]);
        }
        await page.goto(server.base + '/settings');
        await page.getByRole('button', { name: 'Выйти из аккаунта', exact: true }).click();
        await page.waitForURL('**/login*');
        await page.waitForLoadState('load');
        await page.getByRole('button', { name: 'Войти', exact: true }).waitFor();
        console.log('Same browser new registration', width);
        await registration(page, 'second-' + email);
        assert.equal(await page.getByRole('textbox', { name: 'Название заведения', exact: true }).inputValue(), '');
        assert.equal((await api(page, '/api/restaurants/me')).data.restaurant, null);
        assert.equal((await api(page, '/api/venues')).data.venues.length, 1);
        await page.getByRole('textbox', { name: 'Название заведения', exact: true }).fill('Второй аккаунт ' + width);
        await page.getByRole('button', { name: 'Кафе', exact: true }).click();
        await page.getByRole('button', { name: 'Выберите страну', exact: true }).click();
        await page.getByRole('button', { name: /Молдова/ }).click();
        await page.getByRole('button', { name: 'Выберите город', exact: true }).click();
        await page.getByRole('button', { name: 'Кишинёв', exact: true }).click();
        await page.getByRole('button', { name: 'Выберите валюту', exact: true }).click();
        await page.getByRole('button', { name: 'MDL — молдавский лей', exact: true }).click();
        await next.click();
        await page.getByLabel('Мест в зале', { exact: true }).waitFor();
        await next.click();
        await page.getByRole('heading').filter({ hasText: /Зоны/ }).waitFor();
        await next.click();
        await page.getByRole('heading').filter({ hasText: /Тип/ }).waitFor();
        await next.click();
        await page.getByRole('button', { name: 'Создать заведение', exact: true }).click();
        await page.waitForURL('**/home*');
        await page.locator('[data-bd-home-page]').waitFor();
        assert.equal((await api(page, '/api/restaurants/me')).data.restaurant!.name, 'Второй аккаунт ' + width);
        assert.equal((await api(page, '/api/restaurants/me')).data.restaurant!.workingDays,undefined);
        await page.goto(server.base+'/profile');
        await page.locator('.bd-profile-venue-head-v280').click();
        await page.locator('[data-bd-profile-editor="venue-v282"] bd-venue-schedule').waitFor();
        assert.match(await page.locator('[data-bd-profile-editor="venue-v282"] .bd-venue-schedule-summary').innerText(),/Рабочие дни не указаны/);
        assert.equal((await api(page, '/api/venues')).data.venues.length, 1);
        assert.deepEqual(errors, []);
        results.push({ width, layout, pass: true, serverPersisted: true, sameBrowserAccountIsolation: true, duplicatePosts: false, browser: await browser.version() });
        await context.close();
    }
    fs.writeFileSync(out + '/results.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
}
catch (error) {
    for (const context of browser.contexts())
        for (const page of context.pages()) {
            console.error('FAILURE', page.url(), (await page.locator('body').innerText()).slice(0, 3500));
            await page.screenshot({ path: out + '/failure.png' });
        }
    console.error('Recent HTTP', server.requests.slice(-25));
    throw error;
}
finally {
    await browser.close();
    await server.close();
}
