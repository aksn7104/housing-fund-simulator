/*
 * 資金計画の計算ロジック（画面から独立）。
 * ブラウザでは window.Calc、Node では require('./calc.js') で使えます。
 * 税率などの数値はすべて rates.js（window.RATES）から受け取ります。
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  const MAN = 10000;
  const floorTo = (v, unit) => Math.floor(v / unit) * unit;
  const ym = s => (s && /^\d{4}-\d{2}$/.test(s)) ? s : null;

  const TYPE = {
    newMansion:  { label: "新築マンション", isNew: true,  mansion: true },
    usedMansion: { label: "中古マンション", isNew: false, mansion: true },
    newHouse:    { label: "新築一戸建て",   isNew: true,  mansion: false },
    usedHouse:   { label: "中古一戸建て",   isNew: false, mansion: false },
  };
  const PERF = {
    other: "その他の住宅", energy: "省エネ基準適合住宅", zeh: "ZEH水準省エネ住宅",
    long: "認定長期優良住宅", lowcarbon: "認定低炭素住宅",
  };

  function lookup(table, v) {
    for (const [max, tax] of table) if (max === null || v <= max) return tax;
    return 0;
  }

  // 適用期限を過ぎているか（today は "YYYY-MM-DD"）
  const expired = (validUntil, today) => !!validUntil && today > validUntil;

  function brokerage(R, base) {
    const b = R.brokerage;
    let fee = 0, prev = 0;
    for (const [max, rate] of b.tiers) {
      const top = max === null ? base : Math.min(base, max);
      if (top > prev) fee += (top - prev) * rate;
      if (max === null || base <= max) break;
      prev = max;
    }
    return Math.floor(fee * (1 + b.consumptionTax));
  }

  // 登録免許税：課税標準は1,000円未満切捨（1,000円未満は1,000円）、税額は100円未満切捨、1,000円未満は1,000円（法務局）
  const regTax = (base, rate) => base > 0 ? Math.max(1000, floorTo(Math.max(1000, floorTo(base, 1000)) * rate, 100)) : 0;

  // 中古の耐震要件：1982年1月以後の新築、またはそれ以前で証明あり。新築年月が空欄なら満たすとみなす
  function seismicOK(R, i) {
    const t = TYPE[i.type];
    if (t.isNew) return true;
    const b = ym(i.built);
    if (!b) return true;
    return b >= R.registration.seismicFrom || i.quakeCert === true;
  }

  function evaluations(R, i, t) {
    const d = R.defaults;
    const price = i.price * MAN;
    const estimated = !(i.landEval > 0 || i.bldgEval > 0);
    const share = t.mansion ? d.landShareMansion : d.landShareHouse;
    return {
      estimated,
      land: estimated ? price * d.evalRatio * share : (i.landEval || 0) * MAN,
      bldg: estimated ? price * d.evalRatio * (1 - share) : (i.bldgEval || 0) * MAN,
    };
  }

  function registration(R, i, t, ev, loan, today) {
    const g = R.registration;
    const notes = [];
    const floorOK = !(i.floor > 0) || i.floor >= g.minFloor;
    const quakeOK = seismicOK(R, i);
    const eligible = floorOK && quakeOK;
    if (!floorOK) notes.push(`床面積が${g.minFloor}㎡未満のため、建物と抵当権は軽減の対象外（本則税率）`);
    if (!quakeOK) notes.push("1981年以前の建築で耐震基準の証明がないため、建物と抵当権は軽減の対象外（本則税率）");

    let bRate, bLabel, bUntil;
    if (t.isNew) {
      if (!eligible) { bRate = g.save.base; bLabel = "保存0.4%（本則）"; }
      else if (i.perf === "long") { bRate = g.longLife.save; bLabel = "保存0.1%（長期優良）"; bUntil = g.longLife.validUntil; }
      else if (i.perf === "lowcarbon") { bRate = g.lowCarbon.save; bLabel = "保存0.1%（低炭素）"; bUntil = g.lowCarbon.validUntil; }
      else { bRate = g.save.rate; bLabel = "保存0.15%"; bUntil = g.save.validUntil; }
    } else {
      if (!eligible) { bRate = g.transfer.base; bLabel = "移転2.0%（本則）"; }
      else if (i.resale) { bRate = g.resale.transfer; bLabel = "移転0.1%（買取再販）"; bUntil = g.resale.validUntil; }
      else { bRate = g.transfer.rate; bLabel = "移転0.3%"; bUntil = g.transfer.validUntil; }
    }
    const mRate = eligible ? g.mortgage.rate : g.mortgage.base;
    const land = regTax(ev.land, g.land.rate);
    const bldg = regTax(ev.bldg, bRate);
    const mort = regTax(loan, mRate);
    const exp = [];
    if (expired(g.land.validUntil, today)) exp.push(`土地の軽減（${g.land.validUntil}まで）`);
    if (bUntil && expired(bUntil, today)) exp.push(`建物の軽減（${bUntil}まで）`);
    if (eligible && expired(g.mortgage.validUntil, today)) exp.push(`抵当権の軽減（${g.mortgage.validUntil}まで）`);
    return {
      amount: land + bldg + mort, land, bldg, mort, eligible, notes, expired: exp,
      basis: `土地1.5%・建物${bLabel}・抵当権${eligible ? "0.1%" : "0.4%（本則）"}${t.isNew ? "（新築は保存登記とみなす）" : ""}${ev.estimated ? "／評価額は概算" : ""}`,
    };
  }

  function costs(R, i, loan, today) {
    const t = TYPE[i.type];
    const d = R.defaults;
    const price = i.price * MAN;
    const exPrice = Math.max(0, price - (i.bldgTax || 0) * MAN); // 税抜価格
    const items = [];
    const warnings = [];
    if (i.brokered) {
      const fee = brokerage(R, exPrice);
      items.push({ key: "brokerage", name: "仲介手数料", amount: fee,
        basis: `上限額（税抜価格${(exPrice / MAN).toLocaleString("ja-JP")}万円で計算）＋消費税` });
      if (exPrice <= R.brokerage.lowPriceLimit)
        warnings.push(`800万円以下の物件は、事前の合意により仲介手数料が最大${(R.brokerage.lowPriceCap / MAN)}万円（税込）になる場合があります`);
    }
    const st = R.stampSale;
    items.push({ key: "stampSale", name: "印紙税（売買契約書）", amount: lookup(st.table, exPrice),
      basis: "軽減税率（電子契約なら不要）", expired: expired(st.validUntil, today) ? [`軽減税率（${st.validUntil}まで）`] : [] });
    items.push({ key: "stampLoan", name: "印紙税（ローン契約書）", amount: lookup(R.stampLoan.table, loan), basis: "借入額に応じて" });

    const ev = evaluations(R, i, t);
    const reg = registration(R, i, t, ev, loan, today);
    items.push({ key: "registration", name: "登録免許税", amount: reg.amount, basis: reg.basis, notes: reg.notes, expired: reg.expired });
    items.push({ key: "scrivener", name: "司法書士報酬", amount: i.scrivener * MAN, basis: `目安（${R.defaultsAsOf}時点）` });
    if (i.feeRate > 0) items.push({ key: "fee", name: "融資手数料", amount: Math.floor(loan * i.feeRate / 100), basis: `借入額×${i.feeRate}%` });
    const fireAuto = i.fire === null || i.fire === undefined || isNaN(i.fire);
    const fire = fireAuto ? (t.mansion ? d.fireMansion : d.fireHouse) : i.fire;
    items.push({ key: "fire", name: "火災・地震保険", amount: fire * MAN, basis: fireAuto ? `5年分の目安（${R.defaultsAsOf}時点）` : "入力値" });
    if (i.type === "newMansion" && i.repairFund > 0) items.push({ key: "repairFund", name: "修繕積立基金", amount: i.repairFund * MAN, basis: "入居時に一括" });
    if (i.other > 0) items.push({ key: "other", name: "その他", amount: i.other * MAN, basis: "固定資産税の精算金など" });
    return { items, total: items.reduce((s, x) => s + x.amount, 0), ev, reg, warnings };
  }

  // 不動産取得税：課税標準は1,000円未満切捨、税額は100円未満切捨
  function acquisition(R, i, t, ev, today) {
    const a = R.acquisition;
    const notes = [];
    const floor = i.floor > 0 ? i.floor : null;
    const floorOK = floor === null || (floor >= a.floorMin && floor <= a.floorMax);
    const quakeOK = seismicOK(R, i);
    const houseOK = floorOK && quakeOK;
    if (!floorOK) notes.push(`床面積が${a.floorMin}〜${a.floorMax}㎡の範囲外のため、住宅の軽減なし`);
    if (!quakeOK) notes.push("1981年以前の建築で耐震基準の証明がないため、住宅の軽減なし");

    let deduction = 0, dLabel = "控除なし";
    if (houseOK) {
      if (t.isNew) {
        deduction = i.perf === "long" ? a.newDeductionLongLife : a.newDeduction;
        dLabel = `新築住宅の控除${deduction / MAN}万円`;
      } else {
        const b = ym(i.built);
        if (!b) { deduction = a.usedDeduction[0][1]; dLabel = `中古住宅の控除${deduction / MAN}万円（新築年月未入力のため1997年4月以後とみなす）`; }
        else {
          const row = a.usedDeduction.find(([from]) => b >= from);
          deduction = row ? row[1] : 0;
          dLabel = row ? `中古住宅の控除${deduction / MAN}万円（${b.replace("-", "年")}月新築）` : "新築年月が古く控除なし";
        }
      }
    }
    const bBase = floorTo(Math.max(0, ev.bldg - deduction), 1000);
    let bldg = floorTo(bBase * a.rate, 100);
    if (bBase < a.exemptBuilding) bldg = 0; // 免税点（売買による家屋）

    const landBase = floorTo(ev.land / 2, 1000);
    let land = floorTo(landBase * a.rate, 100), lLabel;
    if (landBase < a.exemptLand) { land = 0; lLabel = `課税標準が免税点（${a.exemptLand / MAN}万円）未満のため非課税`; }
    else if (!houseOK) lLabel = "宅地の課税標準1/2・税率3%（住宅用土地の減額なし）";
    else if (i.siteArea > 0) {
      const perSqm = (ev.land / 2) / i.siteArea;
      const area = Math.min((floor || 0) * 2, a.landAreaCap);
      const reduction = Math.max(a.landReductionMin, perSqm * area * a.rate);
      land = floorTo(Math.max(0, land - reduction), 100);
      lLabel = `宅地1/2・税率3%から住宅用土地の減額（${Math.round(reduction).toLocaleString("ja-JP")}円）`;
    } else {
      land = 0;
      lLabel = "敷地面積が未入力のため、住宅用土地の減額で0円とみなす";
    }
    const exp = expired(a.validUntil, today) ? [`税率3%・宅地1/2の特例（${a.validUntil}まで）`] : [];
    const bExempt = bBase < a.exemptBuilding && bBase > 0 ? `・課税標準が免税点（${a.exemptBuilding / MAN}万円）未満のため非課税` : "";
    return { amount: bldg + land, bldg, land, bLabel: `${dLabel}・税率3%${bExempt}${ev.estimated ? "／評価額は概算" : ""}`, lLabel, notes, expired: exp };
  }

  function schedule(P, ratePct, years, method) {
    const n = Math.round(years * 12), r = ratePct / 1200;
    let bal = P, first = 0, totalPay = 0, totalInt = 0, yPay = 0, yInt = 0;
    const rows = [];
    const annuity = n === 0 ? 0 : r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n));
    for (let k = 1; k <= n; k++) {
      const interest = bal * r;
      const principal = method === "annuity" ? annuity - interest : P / n;
      const pay = principal + interest;
      bal = Math.max(0, bal - principal);
      if (k === 1) first = pay;
      totalPay += pay; totalInt += interest; yPay += pay; yInt += interest;
      if (k % 12 === 0 || k === n) { rows.push({ year: Math.ceil(k / 12), pay: yPay, interest: yInt, balance: bal }); yPay = 0; yInt = 0; }
    }
    return { first, totalPay, totalInt, rows, firstYear: rows.length ? rows[0].pay : 0 };
  }

  // 給与収入のみと仮定した合計所得金額（850万円超の区間だけ使う）
  const salaryIncome = gross => gross > 8500000 ? gross - 1950000 : gross * 0.8;

  function loanDeduction(R, i, t, loan, price, sched) {
    const L = R.loanDeduction;
    const res = { years: 0, limit: 0, rows: [], total: 0, first: 0, notes: [], capped: false, applies: false, label: "" };
    const moveIn = i.moveIn || null;
    if (!moveIn || moveIn < L.moveInFrom || moveIn > L.moveInTo) { res.notes.push(`入居年が${L.moveInFrom}〜${L.moveInTo}年の範囲外のため計算していません（現行制度の対象外）`); return res; }
    if (loan <= 0) return res;
    if (i.years < L.minYears) { res.notes.push(`返済期間が${L.minYears}年未満のため対象外`); return res; }
    const gokei = salaryIncome(i.income * MAN);
    if (gokei > L.incomeMax) { res.notes.push("合計所得金額が2,000万円を超えるため対象外（給与収入のみと仮定）"); return res; }
    if (!seismicOK(R, i)) { res.notes.push("1981年以前の建築で耐震基準の証明がないため対象外"); return res; }
    const floor = i.floor > 0 ? i.floor : null;
    const strict = gokei > L.incomeStrictOver;
    if (floor !== null && floor < L.floorMin) { res.notes.push(`床面積が${L.floorMin}㎡未満のため対象外`); return res; }
    if (floor !== null && strict && floor < L.floorMinStrict) { res.notes.push(`合計所得1,000万円超の場合は床面積${L.floorMinStrict}㎡以上が必要なため対象外`); return res; }

    const perf = PERF[i.perf] ? i.perf : "other";
    let lim = L.limits[t.isNew ? "new" : (i.resale ? "resale" : "used")][perf];
    if (t.isNew && perf === "energy" && moveIn >= 2028) { lim = L.newEnergyFrom2028; res.notes.push("2028年以降入居の省エネ基準適合の新築は、2027年末までに建築確認を受けた場合などに限り対象"); }
    if (!lim) { res.notes.push("省エネ基準を満たさない新築住宅は対象外（2023年末までに建築確認を受けたものを除く）"); return res; }
    let limit = lim[0];
    if (i.kids && lim[1] > lim[0]) {
      if (floor !== null && floor < L.floorMinStrict) res.notes.push(`子育て世帯等の上乗せは床面積${L.floorMinStrict}㎡以上が必要なため、上乗せなしで計算`);
      else limit = lim[1];
    }
    const years = Math.min(lim[2], sched.rows.length);
    const share = Math.min(1, price / loan); // 諸費用分の借入は控除の対象外
    if (share < 1) res.notes.push("諸費用分の借入は控除の対象外として、物件価格に相当する部分だけで計算");

    const hasTax = i.incomeTax !== null && i.incomeTax !== undefined && !isNaN(i.incomeTax);
    // 住民税からは課税総所得金額等の5%（最高9.75万円）まで。課税総所得金額等の5%は所得割（約10%）の半分で近似
    const cap = hasTax ? i.incomeTax * MAN + Math.min((i.residentTax || 0) * MAN * L.residentTaxShare, L.residentTaxCap) : Infinity;
    for (let y = 0; y < years; y++) {
      const bal = sched.rows[y].balance * share;
      let d = floorTo(Math.min(bal, limit) * L.rate, 100);
      if (d > cap) { d = floorTo(cap, 100); res.capped = true; }
      res.rows.push({ year: y + 1, balance: bal, amount: d });
      res.total += d;
    }
    res.first = res.rows.length ? res.rows[0].amount : 0;
    res.applies = res.total > 0;
    res.years = years; res.limit = limit;
    res.label = `${PERF[perf]}・${t.isNew ? "新築" : (i.resale ? "買取再販" : "中古")}${limit > lim[0] ? "・子育て等の上乗せ" : ""}`;
    res.maxOnly = !hasTax;
    return res;
  }

  function propertyTax(R, i, t, ev, years) {
    const p = R.propertyTax;
    const manual = i.propTax !== null && i.propTax !== undefined && !isNaN(i.propTax);
    if (manual) return { estimated: false, first: i.propTax, perYear: Array.from({ length: years }, () => i.propTax), total: i.propTax * years };
    const land = ev.land * p.smallLandFixed * p.fixedRate + ev.land * p.smallLandCity * p.cityRate;
    const bFixed = ev.bldg * p.fixedRate, bCity = ev.bldg * p.cityRate;
    let halfYears = 0;
    const floor = i.floor > 0 ? i.floor : 70;
    if (t.isNew && floor >= p.newHalfFloorMin && floor <= p.newHalfFloorMax) {
      halfYears = i.perf === "long"
        ? (t.mansion ? p.newHalfYearsLongLifeMansion : p.newHalfYearsLongLife)
        : (t.mansion ? p.newHalfYearsMansion : p.newHalfYears);
    }
    const halfShare = Math.min(1, p.newHalfAreaCap / floor);
    const perYear = [];
    for (let y = 0; y < years; y++) {
      const fixedB = y < halfYears ? bFixed * (1 - 0.5 * halfShare) : bFixed;
      perYear.push(floorTo(land + fixedB + bCity, 100));
    }
    return { estimated: true, first: perYear[0] || 0, perYear, total: perYear.reduce((s, v) => s + v, 0), halfYears };
  }

  function run(R, i, today) {
    today = today || new Date().toISOString().slice(0, 10);
    const t = TYPE[i.type];
    const price = i.price * MAN;
    const base = Math.max(0, price - i.down * MAN);
    let loan = base, c = costs(R, i, loan, today);
    if (i.costsInLoan) {
      for (let k = 0; k < 8; k++) { loan = base + c.total; c = costs(R, i, loan, today); }
    }
    const own = price + c.total - loan;
    const s = schedule(loan, i.rate, i.years, i.method);
    const screen = schedule(loan, i.screenRate, i.years, "annuity");
    const income = i.income * MAN;
    const sc = R.screening;
    const limit = income > 0 && income < sc.lowIncome ? sc.lowIncomeLimit : sc.limit;
    const ratio = income > 0 ? s.firstYear / income : null;
    const screenRatio = income > 0 ? screen.firstYear / income : null;
    let level = "none";
    if (ratio !== null && loan > 0) {
      if (ratio > limit || screenRatio > limit + 0.05) level = "over";
      else if (ratio > sc.comfortable || screenRatio > limit) level = "warn";
      else level = "ok";
    }
    const acq = acquisition(R, i, t, c.ev, today);
    const ded = loanDeduction(R, i, t, loan, price, s);
    const years = s.rows.length;
    const pt = propertyTax(R, i, t, c.ev, years);
    const monthlyFees = (i.mgmt || 0) + (i.repair || 0);
    const maintTotal = monthlyFees * 12 * years + pt.total;
    const monthlyCost = s.first + monthlyFees + pt.first / 12 - ded.first / 12;
    const realTotal = own + acq.amount + s.totalPay + maintTotal - ded.total;
    return {
      type: t, typeLabel: t.label, price, loan, own, costs: c, sched: s,
      limit, ratio, screenRatio, level,
      takehomeRatio: i.takehome > 0 ? s.first / (i.takehome * MAN) : null,
      acquisition: acq, deduction: ded, propertyTax: pt,
      monthlyFees, maintTotal, monthlyCost, realTotal,
      endAge: i.age > 0 ? i.age + i.years : null,
    };
  }

  return { run, brokerage, regTax, schedule, lookup, expired, TYPE, PERF };
});
