// 検証ケース T-01〜T-22（要件定義書「受け入れ基準と検証ケース」）を実行します。
// 実行方法：node tests/run-tests.js
const fs = require("fs");
const path = require("path");
const Calc = require("../calc.js");
const src = fs.readFileSync(path.join(__dirname, "..", "rates.js"), "utf8");
const R = JSON.parse(src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1));
const TODAY = "2026-10-25";

const base = {
  type: "usedMansion", price: 4000, bldgTax: 0, brokered: true, down: 400, costsInLoan: false,
  rate: 0.8, years: 35, age: null, method: "annuity", income: 650, takehome: null, screenRate: 3.5,
  feeRate: 2.2, landEval: null, bldgEval: null, scrivener: 10, fire: null, repairFund: 40, other: 10,
  perf: "other", resale: false, built: "", quakeCert: false, floor: 70, kids: false, moveIn: 2026,
  incomeTax: null, residentTax: null, siteArea: null, mgmt: 0, repair: 0, propTax: null,
};
const run = over => Calc.run(R, { ...base, ...over }, TODAY);
const item = (r, key) => (r.costs.items.find(x => x.key === key) || {}).amount;

const cases = [
  ["T-01", "毎月返済額", () => Math.round(run({}).sched.first), 98302],
  ["T-02", "登録免許税", () => item(run({}), "registration"), 194400],
  ["T-03", "印紙税（売買・ローン）", () => [item(run({}), "stampSale"), item(run({}), "stampLoan")].join("/"), "10000/20000"],
  ["T-04", "仲介手数料", () => item(run({}), "brokerage"), 1386000],
  ["T-05", "元金均等 初回・利息総額", () => { const r = run({ method: "principal" }); return Math.round(r.sched.first) + "/" + Math.round(r.sched.totalInt); }, "109714/5052000"],
  ["T-06", "金利0%", () => Math.round(run({ rate: 0 }).sched.first), 85714],
  ["T-07", "300万円の仲介手数料", () => item(run({ price: 300, down: 0 }), "brokerage"), 154000],
  ["T-08", "年収380万円・負担率31%の判定", () => {
    // 年収380万円で1年目の負担率が約31%になる借入（元利均等0.8%・35年）
    const r = run({ income: 380, price: 3600, down: 0 });
    return (r.ratio > 0.30 && r.ratio < 0.32 ? "31%台" : r.ratio.toFixed(3)) + "/" + r.level;
  }, "31%台/over"],
  ["T-09", "税抜価格での仲介手数料", () => item(run({ type: "newMansion", price: 5500, bldgTax: 200, down: 500 }), "brokerage"), Math.floor((5300e4 * 0.03 + 6e4) * 1.1)],
  ["T-10", "完済時年齢", () => run({ age: 38 }).endAge, 73],
  ["T-13", "長期優良住宅の登録免許税", () => item(run({ type: "newMansion", price: 5500, down: 500, perf: "long", brokered: false }), "registration"), 221600],
  ["T-14", "耐震証明なしの登録免許税", () => { const r = run({ built: "1979-05", quakeCert: false }); return item(r, "registration") + "/" + (r.costs.reg.notes.length > 0); }, "588000/true"],
  ["T-15", "50㎡未満の登録免許税", () => item(run({ floor: 45 }), "registration"), 588000],
  ["T-16", "買取再販の登録免許税", () => item(run({ resale: true }), "registration"), 160800],
  ["T-17", "ローン控除の合計（最大額表示）", () => { const d = run({}).deduction; return d.total + "/" + d.maxOnly; }, "1400000/true"],
  ["T-18", "長期優良・子育ての控除", () => { const d = run({ type: "newMansion", price: 5500, down: 500, rate: 0.6, perf: "long", kids: true, brokered: false }).deduction; return d.first + "/" + d.total + "/" + d.years; }, "340900/3708800/13"],
  ["T-19", "新築の取得税（家屋）", () => run({ type: "newHouse", bldgEval: 1500, landEval: 0, brokered: false }).acquisition.bldg, 90000],
  ["T-20", "45㎡・子育ての限度額", () => { const d = run({ perf: "energy", floor: 45, kids: true }).deduction; return d.limit + "/" + d.notes.some(n => n.includes("上乗せなし")); }, "20000000/true"],
  ["T-21", "2031年入居", () => { const d = run({ moveIn: 2031 }).deduction; return d.total + "/" + d.notes.some(n => n.includes("対象外")); }, "0/true"],
  ["T-22", "月々の住居費", () => Math.round(run({ mgmt: 15000, repair: 12000, propTax: 120000 }).monthlyCost), 123635],
];

let fail = 0;
for (const [id, name, fn, expected] of cases) {
  let got;
  try { got = fn(); } catch (e) { got = "ERROR " + e.message; }
  const ok = String(got) === String(expected);
  if (!ok) fail++;
  console.log(`${ok ? "OK  " : "NG  "} ${id} ${name}: ${got}${ok ? "" : `（期待値 ${expected}）`}`);
}
console.log(`\n${cases.length - fail}/${cases.length} 件合格`);
console.log("※ T-11（URL共有の復元）と T-12（表示・印刷）はブラウザで確認します。");
process.exit(fail ? 1 : 0);
