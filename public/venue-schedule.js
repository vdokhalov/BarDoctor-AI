(function (root) {
  "use strict";
  var labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  var names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  function daysOf(value) {
    if (!value || typeof value !== "object") return null;
    return labels.map(function (_, index) {
      var numeric = value[String(index + 1)], legacy = value[names[index]];
      return typeof numeric === "boolean" ? numeric : numeric && typeof numeric === "object" ? numeric.enabled !== false : typeof legacy === "boolean" ? legacy : legacy && typeof legacy === "object" ? legacy.enabled !== false : null;
    });
  }
  function toggleDays(value, day) {
    var next = Object.assign({}, value || {});
    var selected = daysOf(value) || labels.map(function () { return false; });
    selected[day - 1] = !selected[day - 1];
    names.forEach(function (name) { if (typeof next[name] === "boolean") delete next[name]; });
    selected.forEach(function (enabled, index) {
      if (index === day - 1 || typeof next[String(index + 1)] !== "object") next[String(index + 1)] = enabled === true;
    });
    return next;
  }
  function summary(value) {
    var days = daysOf(value.workingDays);
    var chosen = days ? labels.filter(function (_, index) { return days[index] === true; }) : [];
    var text = chosen.length ? chosen.join(", ") : "Рабочие дни не указаны";
    if (value.openTime && value.closeTime) {
      text += " · " + value.openTime + "–" + value.closeTime;
      if (value.closeTime <= value.openTime) text += " следующего дня";
    }
    return text;
  }
  function create(tag, className, content) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
  }
  class VenueSchedule extends HTMLElement {
    constructor() {
      super();
      this._value = {openTime:"10:00",closeTime:"23:00",workingDays:undefined};
    }
    set value(next) {
      var value = {
        openTime: next && next.openTime || "10:00",
        closeTime: next && next.closeTime || "23:00",
        workingDays: next && next.workingDays
      };
      if (JSON.stringify(value) === JSON.stringify(this._value)) return;
      this._value = value;
      if (this.isConnected) this.render();
    }
    get value() { return Object.assign({}, this._value); }
    connectedCallback() { this.render(); }
    changed(value) {
      this._value = value;
      this.render();
      this.dispatchEvent(new CustomEvent("schedulechange", {bubbles:true,detail:this.value}));
    }
    render() {
      var current = this._value, days = daysOf(current.workingDays);
      var box = create("div","bd-venue-schedule");
      box.appendChild(create("div","bd-venue-schedule-title","График работы"));
      var grid = create("div","bd-venue-schedule-days");
      grid.setAttribute("role","group");
      grid.setAttribute("aria-label","Рабочие дни");
      labels.forEach((label,index) => {
        var button = create("button","bd-venue-schedule-day",label);
        button.type = "button";
        button.setAttribute("aria-label",["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"][index]);
        button.setAttribute("aria-pressed",days && days[index] === true ? "true" : "false");
        button.addEventListener("click",() => {
          this.changed(Object.assign({},this._value,{workingDays:toggleDays(this._value.workingDays,index+1)}));
          this.querySelectorAll(".bd-venue-schedule-day")[index]?.focus();
        });
        grid.appendChild(button);
      });
      box.appendChild(grid);
      var hours = create("div","bd-venue-schedule-hours");
      [["openTime","Открытие"],["closeTime","Закрытие"]].forEach((item) => {
        var field = create("label","bd-venue-schedule-time",item[1]);
        var input = create("input");
        input.type = "time";
        input.value = current[item[0]];
        input.addEventListener("change",() => {
          this._value = Object.assign({},this._value,{[item[0]]:input.value});
          this.dispatchEvent(new CustomEvent("schedulechange",{bubbles:true,detail:this.value}));
          var summaryNode = this.querySelector(".bd-venue-schedule-summary");
          if (summaryNode) summaryNode.textContent = summary(this._value);
        });
        field.appendChild(input);
        hours.appendChild(field);
      });
      box.appendChild(hours);
      var description = create("p","bd-venue-schedule-summary",summary(current));
      description.setAttribute("aria-live","polite");
      box.appendChild(description);
      this.replaceChildren(box);
    }
  }
  root.bdVenueSchedule = {daysOf:daysOf,toggleDays:toggleDays,summary:summary};
  if (root.customElements && !root.customElements.get("bd-venue-schedule")) {
    root.customElements.define("bd-venue-schedule",VenueSchedule);
  }
})(window);
