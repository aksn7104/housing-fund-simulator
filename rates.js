/*
 * 税率・上限額・適用期限・前提値をまとめたファイルです。
 * 税制改正があったら、このファイルの該当箇所だけを書き換えてください。
 * 2行目以降は JSON と同じ書き方です（キーと文字列は "ダブルクォート"、最後の要素の後ろにカンマを付けない）。
 * validUntil を過ぎた項目は、画面に「適用期限を過ぎています」と表示されます。
 */
window.RATES = {
  "version": "1.1.0",
  "checkedAt": "2026-10-25",
  "defaultsAsOf": "2026年10月",

  "brokerage": {
    "label": "仲介手数料の上限",
    "tiers": [[2000000, 0.05], [4000000, 0.04], [null, 0.03]],
    "consumptionTax": 0.10,
    "lowPriceLimit": 8000000,
    "lowPriceCap": 330000,
    "source": "https://www.mlit.go.jp/totikensangyo/const/1_6_bf_000013.html",
    "checkedAt": "2026-09-23"
  },

  "stampSale": {
    "label": "印紙税（売買契約書）の軽減税率",
    "validUntil": "2027-03-31",
    "table": [[10000, 0], [500000, 200], [1000000, 500], [5000000, 1000], [10000000, 5000], [50000000, 10000], [100000000, 30000], [500000000, 60000], [1000000000, 160000], [null, 320000]],
    "source": "https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7108.htm",
    "checkedAt": "2026-09-23"
  },

  "stampLoan": {
    "label": "印紙税（ローン契約書）",
    "table": [[9999, 0], [100000, 200], [500000, 400], [1000000, 1000], [5000000, 2000], [10000000, 10000], [50000000, 20000], [100000000, 60000], [500000000, 100000], [null, 200000]],
    "source": "https://www.nta.go.jp/taxes/shiraberu/taxanswer/inshi/7140.htm",
    "checkedAt": "2026-09-23"
  },

  "registration": {
    "label": "登録免許税",
    "land": { "rate": 0.015, "base": 0.02, "validUntil": "2029-03-31" },
    "save": { "rate": 0.0015, "base": 0.004, "validUntil": "2027-03-31" },
    "transfer": { "rate": 0.003, "base": 0.02, "validUntil": "2027-03-31" },
    "mortgage": { "rate": 0.001, "base": 0.004, "validUntil": "2027-03-31" },
    "longLife": { "save": 0.001, "transferMansion": 0.001, "transferHouse": 0.002, "validUntil": "2027-03-31" },
    "lowCarbon": { "save": 0.001, "transfer": 0.001, "validUntil": "2027-03-31" },
    "resale": { "transfer": 0.001, "validUntil": "2027-03-31" },
    "minFloor": 50,
    "seismicFrom": "1982-01",
    "source": "https://www.nta.go.jp/publication/pamph/sonota/0020003-124_01.pdf",
    "source2": "https://www.nta.go.jp/publication/pamph/sonota/0020003-124_02.pdf",
    "source3": "https://houmukyoku.moj.go.jp/homu/content/001443859.pdf",
    "minTax": 1000,
    "checkedAt": "2026-10-25"
  },

  "acquisition": {
    "label": "不動産取得税",
    "rate": 0.03,
    "validUntil": "2027-03-31",
    "landHalfUntil": "2027-03-31",
    "floorMin": 40,
    "floorMax": 240,
    "newDeduction": 12000000,
    "newDeductionLongLife": 13000000,
    "landReductionMin": 45000,
    "exemptLand": 160000,
    "exemptBuilding": 340000,
    "landAreaCap": 200,
    "usedDeduction": [
      ["1997-04", 12000000], ["1989-04", 10000000], ["1985-07", 4500000], ["1981-07", 4200000],
      ["1976-01", 3500000], ["1973-01", 2300000], ["1964-01", 1500000], ["1954-07", 1000000]
    ],
    "source": "https://www.pref.chiba.lg.jp/zeimu/aramashi/shurui/hudousan-keigen.html",
    "source2": "https://www.tax.metro.tokyo.lg.jp/shitsumon/real_estate/f",
    "checkedAt": "2026-10-25",
    "source3": "https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/149767_11.html",
    "source4": "https://www.pref.osaka.lg.jp/o050040/zei/alacarte/fudousan.html",
    "note": "税率3%と期限は総務省で確認。免税点（2026年4月1日以後の取得：土地16万円、売買による家屋34万円）は大阪府で確認"
  },

  "loanDeduction": {
    "label": "住宅ローン控除",
    "moveInFrom": 2026,
    "moveInTo": 2030,
    "rate": 0.007,
    "minYears": 10,
    "floorMin": 40,
    "floorMinStrict": 50,
    "incomeStrictOver": 10000000,
    "incomeMax": 20000000,
    "residentTaxCap": 97500,
    "residentTaxShare": 0.5,
    "limits": {
      "new":  { "long": [45000000, 50000000, 13], "lowcarbon": [45000000, 50000000, 13], "zeh": [35000000, 45000000, 13], "energy": [20000000, 30000000, 13], "other": null },
      "used": { "long": [35000000, 45000000, 13], "lowcarbon": [35000000, 45000000, 13], "zeh": [35000000, 45000000, 13], "energy": [20000000, 30000000, 13], "other": [20000000, 20000000, 10] },
      "resale": { "long": [45000000, 50000000, 13], "lowcarbon": [45000000, 50000000, 13], "zeh": [35000000, 45000000, 13], "energy": [20000000, 30000000, 13], "other": [20000000, 20000000, 10] }
    },
    "newEnergyFrom2028": [20000000, 20000000, 10],
    "source": "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk2_000017.html",
    "source2": "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk4_000327.html",
    "source3": "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_tk4_000328.html",
    "source4": "https://www.soumu.go.jp/main_sosiki/jichi_zeisei/czaisei/czaisei_seido/090929.html",
    "source5": "https://www.nta.go.jp/taxes/shiraberu/taxanswer/shotoku/1211-1.htm",
    "checkedAt": "2026-10-25",
    "note": "住民税からの控除は課税総所得金額等の5%（最高9.75万円、総務省）。課税総所得金額等は住民税所得割の半分で近似"
  },

  "propertyTax": {
    "label": "固定資産税・都市計画税",
    "fixedRate": 0.014,
    "cityRate": 0.003,
    "smallLandFixed": 0.16666666666666666,
    "smallLandCity": 0.3333333333333333,
    "newHalfYears": 3,
    "newHalfYearsMansion": 5,
    "newHalfYearsLongLife": 5,
    "newHalfYearsLongLifeMansion": 7,
    "newHalfAreaCap": 120,
    "newHalfFloorMin": 40,
    "newHalfFloorMax": 240,
    "source": "https://www.tax.metro.tokyo.lg.jp/kazei/real_estate/kotei_tosi",
    "checkedAt": "2026-10-25",
    "source2": "https://www.city.osaka.lg.jp/zaisei/page/0000240566.html",
    "note": "都市計画税0.3%は23区の税率。新築減額の床面積は2026年4月1日以後の新築で40〜240㎡（大阪市）。負担調整措置・自治体独自の軽減は反映しない"
  },

  "screening": {
    "label": "返済負担率の審査基準（フラット35）",
    "lowIncome": 4000000,
    "lowIncomeLimit": 0.30,
    "limit": 0.35,
    "comfortable": 0.25,
    "maxEndAge": 80,
    "source": "https://www.rakuten-bank.co.jp/home-loan/flat35/purchase/detail.html",
    "checkedAt": "2026-09-23"
  },

  "defaults": {
    "rate": 0.8,
    "screenRate": 3.5,
    "feeRate": 2.2,
    "scrivener": 10,
    "fireMansion": 8,
    "fireHouse": 25,
    "repairFund": 40,
    "other": 10,
    "evalRatio": 0.6,
    "landShareMansion": 0.3,
    "landShareHouse": 0.5
  }
};
