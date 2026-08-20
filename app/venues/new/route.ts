import { barDoctorResponse } from "../../bar-doctor-response";
import { canonicalUserShellAssets } from "../../../lib/bardoctor/app-shell";

const VENUE_CREATE_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#12172f" />
    <title>Новое заведение — BarDoctor</title>
    <link rel="stylesheet" href="/venue-create.css?v=20260811-navigation-v85" />
    <link rel="stylesheet" href="/venue-create-selects.css?v=20260811-location-selects-v2" />
    <link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260814-navigation-v185" defer></script>
    <script src="/venue-location-data.js?v=20260811-location-selects-v2" defer></script>
    <script src="/venue-create.js?v=20260811-location-selects-v2" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/more">
    <header class="venue-topbar">
      <a href="/more" class="icon-button" aria-label="Отменить и вернуться" data-bd-back>←</a>
      <div class="brand"><img src="/icons/bardoctor-mark-v159.svg" alt="" aria-hidden="true" /><div><small>BARDOCTOR</small><strong>Новое заведение</strong></div></div>
      <span class="clean-badge">Чистое</span>
    </header>

    <main class="venue-page">
      <section class="venue-intro">
        <p class="eyebrow">ЕЩЁ ОДНА ТОЧКА</p>
        <h1>Создайте новое<br />заведение</h1>
        <p>Оно появится пустым: без сотрудников, товаров, склада, смен, финансов и интеграций другого заведения.</p>
        <div class="isolation-note"><b>✓</b><span><strong>Данные не копируются</strong><small>Настройки и учёт начнутся с чистого листа.</small></span></div>
      </section>

      <div id="venue-notice" class="notice hidden" role="alert" aria-live="assertive"></div>

      <form id="venue-create-form" class="venue-form">
        <section class="form-section">
          <div class="section-heading"><span>01</span><div><small>ОСНОВНОЕ</small><h2>Что это за заведение</h2></div></div>
          <label class="field">Название заведения *<input name="name" required maxlength="120" autocomplete="organization" placeholder="Например: Bar №2" /></label>
          <fieldset class="choice-field">
            <legend>Тип заведения *</legend>
            <div class="choice-grid" data-business-types>
              <label><input type="radio" name="businessType" value="Бар" required /><span>Бар</span></label>
              <label><input type="radio" name="businessType" value="Ресторан" /><span>Ресторан</span></label>
              <label><input type="radio" name="businessType" value="Кафе" /><span>Кафе</span></label>
              <label><input type="radio" name="businessType" value="Караоке" /><span>Караоке</span></label>
              <label><input type="radio" name="businessType" value="Ночной клуб" /><span>Ночной клуб</span></label>
              <label><input type="radio" name="businessType" value="Другое" /><span>Другое</span></label>
            </div>
          </fieldset>
          <label class="field">Формат <input name="venueFormat" maxlength="160" placeholder="Например: караоке-бар, семейное кафе" /></label>
        </section>

        <section class="form-section">
          <div class="section-heading"><span>02</span><div><small>ЛОКАЦИЯ</small><h2>Где находится</h2></div></div>
          <div class="two-columns">
            <label class="field">Страна *
              <span class="select-control">
                <select id="venue-country" name="country" required autocomplete="country-name">
                  <option value="">Выберите страну</option>
                </select>
                <span aria-hidden="true">⌄</span>
              </span>
            </label>
            <label class="field">Город *
              <span class="select-control">
                <select id="venue-city" name="city" required autocomplete="address-level2" aria-describedby="venue-city-help" disabled>
                  <option value="">Сначала выберите страну</option>
                </select>
                <span aria-hidden="true">⌄</span>
              </span>
              <small id="venue-city-help" class="field-help">Список городов появится после выбора страны</small>
            </label>
          </div>
          <div class="two-columns">
            <label class="field">Регион <input name="region" maxlength="100" autocomplete="address-level1" placeholder="Приднестровье" /></label>
            <label class="field">Район <input name="district" maxlength="100" autocomplete="address-level3" placeholder="Центр" /></label>
          </div>
          <label class="field">Адрес <input name="address" maxlength="180" autocomplete="street-address" placeholder="Улица и номер дома" /></label>
          <label class="field">Валюта *
            <select name="currency" required>
              <option value="MDL">MDL — молдавский лей</option>
              <option value="EUR">EUR — евро</option>
              <option value="USD">USD — доллар</option>
              <option value="RUB">RUB — российский рубль</option>
              <option value="UAH">UAH — гривна</option>
            </select>
          </label>
        </section>

        <section class="form-section">
          <div class="section-heading"><span>03</span><div><small>РЕЖИМ РАБОТЫ</small><h2>Когда вы открыты</h2></div></div>
          <div class="two-columns">
            <label class="field">Открытие <input name="openTime" type="time" value="10:00" /></label>
            <label class="field">Закрытие <input name="closeTime" type="time" value="23:00" /></label>
          </div>
          <fieldset class="days-field">
            <legend>Рабочие дни</legend>
            <div class="days-grid">
              <label><input type="checkbox" name="day" value="monday" checked /><span>Пн</span></label>
              <label><input type="checkbox" name="day" value="tuesday" checked /><span>Вт</span></label>
              <label><input type="checkbox" name="day" value="wednesday" checked /><span>Ср</span></label>
              <label><input type="checkbox" name="day" value="thursday" checked /><span>Чт</span></label>
              <label><input type="checkbox" name="day" value="friday" checked /><span>Пт</span></label>
              <label><input type="checkbox" name="day" value="saturday" checked /><span>Сб</span></label>
              <label><input type="checkbox" name="day" value="sunday" checked /><span>Вс</span></label>
            </div>
          </fieldset>
          <div class="two-columns">
            <label class="field">Мест в зале <input name="seats" type="number" min="0" max="100000" inputmode="numeric" placeholder="80" /></label>
            <label class="field">Сотрудников <input name="employees" type="number" min="0" max="100000" inputmode="numeric" placeholder="15" /></label>
          </div>
        </section>

        <section class="submit-card">
          <div><strong>После создания</strong><p>BarDoctor переключится на новое заведение и покажет понятные пустые состояния для первого запуска.</p></div>
          <button id="create-venue-button" type="submit">Создать заведение</button>
          <a href="/more" data-bd-back>Отмена</a>
        </section>
      </form>
    </main>
  </body>
</html>`;

export function GET(request: Request): Response {
  if (new URL(request.url).searchParams.get("embedded") !== "1") return barDoctorResponse();
  return new Response(VENUE_CREATE_HTML, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
