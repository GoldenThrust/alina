process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

fetch("https://192.168.1.100/ai", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    input: {
      event: "skin_scan_completed",
      userId: "fa862c8a-d66e-41cf-8d73-c2cac46fe946",
      scanId: "1aff7d91-1cf2-406c-836f-88bfc68ae53e",
      scan: {
        id: "1aff7d91-1cf2-406c-836f-88bfc68ae53e",
        score: 77.73333333333333,
        skinAge: 38,
        analysis: {
          skinAnalysisRecord: {
            acne: 62.972774505615234,
            ageSpot: 81.17642211914062,
            createdAt: "2026-10-29T15:48:56.721248Z",
            darkCircle: 62.37848103046417,
            droopyLowerEyelid: 80.46141862869263,
            droopyUpperEyelid: 70.76332569122314,
            eyeBag: 72.02791571617126,
            firmness: 71.32099866867065,
            id: "f37a0af0-e2a4-4ccb-88f2-723dd5e241c5",
            moisture: 60.87659001350403,
            oiliness: 56.97590255737305,
            pore: {
              forehead: 85.30052947998047,
              nose: 100,
              cheek: 100,
              whole: 96.32513427734375,
            },
            radiance: 71.53671383857727,
            redness: 91.09649658203125,
            scanId: "1aff7d91-1cf2-406c-836f-88bfc68ae53e",
            skinType: { whole: "Oily", t_zone: "Oily", u_zone: "Oily" },
            tearTrough: 46.76550626754761,
            texture: 88.04705882352941,
            wrinkle: {
              forehead: 74.61219787597656,
              glabellar: 97.6972883939743,
              crowfeet: 98.22772443294525,
              periocular: 86.77980899810791,
              nasolabial: 85.80158352851868,
              marionette: 99,
              whole: 81.19600057601929,
            },
          },
          skinTone: "#614736",
          fitzpatrick: "VI",
        },
      },
    },
  }),
})
  .then((res) => res.text())
  .then((text) => console.log(text));
