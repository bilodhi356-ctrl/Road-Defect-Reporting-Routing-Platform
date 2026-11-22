(function () {
  const translations = {
    en: {
      'language.label': 'Language',
      'nav.report': 'Report a defect',
      'nav.track': 'Track report',
      'nav.staff': 'Staff portal →',
      'hero.eyebrow': 'KISUMU–BUSIA ROAD CORRIDOR',
      'hero.title': 'Safer roads start<br>with <em>your report.</em>',
      'hero.lead': 'Spotted a pothole, washed-out road, or damaged culvert? Send the location and evidence to the responsible KeNHA office.',
      'hero.gps': '◉ GPS routed',
      'hero.photo': '◈ Photo evidence',
      'hero.updates': '✓ Follow-up updates',
      'form.title': 'Report a road defect',
      'form.subtitle': 'Help us direct this to the right team.',
      'form.category': 'What did you notice?',
      'form.selectType': 'Select defect type',
      'category.pothole': 'Pothole',
      'category.erosion': 'Erosion / washout',
      'category.culvert': 'Damaged culvert',
      'category.drainage': 'Blocked drainage',
      'category.bridge': 'Damaged bridge',
      'category.other': 'Other road hazard',
      'form.severity': 'Severity',
      'form.selectSeverity': 'Select severity',
      'severity.low': 'Low',
      'severity.medium': 'Medium',
      'severity.high': 'High',
      'severity.critical': 'Critical',
      'form.roadName': 'Road name / number',
      'form.roadPlaceholder': 'e.g. Nairobi–Nakuru Road',
      'form.landmark': 'Nearest landmark',
      'form.landmarkPlaceholder': 'e.g. Market junction',
      'form.description': 'Tell us a little more',
      'form.descriptionPlaceholder': 'e.g. Large pothole near the market junction',
      'form.consent': 'I agree that the road authority may contact me about this report.',
      'form.email': 'Email address',
      'form.phone': 'Phone number',
      'form.contactPrivacy': 'Provide at least one contact method. Your details are visible only to authorised staff and are not published.',
      'form.location': 'Defect location',
      'form.useGps': 'Use current GPS',
      'form.locationHelp': 'GPS shows where you are now. If you’re reporting from elsewhere, select the defect on the map.',
      'form.locationNote': 'Click the map to place a pin at the defect. You can drag the pin to adjust it.',
      'form.photo': 'Photo evidence',
      'form.addPhoto': 'Add photo',
      'form.photoHelp': 'A photo taken at the site may help staff verify the location. If clarification is needed, staff can contact you only if you give consent.',
      'form.submit': 'Send report',
      'track.eyebrow': 'REPORT FOLLOW-UP',
      'track.title': 'Track a submitted report',
      'track.lead': 'Enter your report reference to see its current status.',
      'track.check': 'Check status',
      'track.placeholder': 'e.g. KRR-2026-1042'
    },
    sw: {
      'language.label': 'Lugha',
      'nav.report': 'Ripoti kasoro',
      'nav.track': 'Fuatilia ripoti',
      'nav.staff': 'Portal ya wafanyakazi →',
      'hero.eyebrow': 'UKANDA WA BARABARA YA KISUMU–BUSIA',
      'hero.title': 'Barabara salama huanza<br>kwa <em>ripoti yako.</em>',
      'hero.lead': 'Umetambua shimo, barabara iliyovurugika au korongo iliyoharibika? Tuma eneo na ushahidi kwa ofisi husika ya KeNHA.',
      'hero.gps': '◉ Imeelekezwa kwa GPS',
      'hero.photo': '◈ Ushahidi wa picha',
      'hero.updates': '✓ Sasisho za ufuatiliaji',
      'form.title': 'Ripoti kasoro ya barabara',
      'form.subtitle': 'Tusaidie kuipeleka ripoti hii kwa timu sahihi.',
      'form.category': 'Ulitambua nini?',
      'form.selectType': 'Chagua aina ya kasoro',
      'category.pothole': 'Shimo',
      'category.erosion': 'Mmomonyoko / kusombwa na maji',
      'category.culvert': 'Korongo iliyoharibika',
      'category.drainage': 'Mfereji ulioziba',
      'category.bridge': 'Daraja lililoharibika',
      'category.other': 'Hatari nyingine barabarani',
      'form.severity': 'Ukali',
      'form.selectSeverity': 'Chagua ukali',
      'severity.low': 'Chini',
      'severity.medium': 'Wastani',
      'severity.high': 'Juu',
      'severity.critical': 'Hatari',
      'form.roadName': 'Jina / namba ya barabara',
      'form.roadPlaceholder': 'mfano Barabara ya Nairobi–Nakuru',
      'form.landmark': 'Alama ya karibu',
      'form.landmarkPlaceholder': 'mfano Mahali pa soko',
      'form.description': 'Tueleze zaidi',
      'form.descriptionPlaceholder': 'mfano Shimo kubwa karibu na mahali pa soko',
      'form.consent': 'Nakubali kwamba mamlaka ya barabara inaweza kuwasiliana nami kuhusu ripoti hii.',
      'form.email': 'Anwani ya barua pepe',
      'form.phone': 'Namba ya simu',
      'form.contactPrivacy': 'Toa angalau njia moja ya mawasiliano. Maelezo yako yanaonekana kwa wafanyakazi walioidhinishwa pekee na hayachapishwi.',
      'form.location': 'Eneo la kasoro',
      'form.useGps': 'Tumia GPS ya sasa',
      'form.locationHelp': 'GPS inaonyesha ulipo sasa. Kama unaripoti kutoka mahali pengine, chagua eneo la kasoro kwenye ramani.',
      'form.locationNote': 'Bonyeza ramani kuweka alama mahali pa kasoro. Unaweza kusogeza alama kuirekebisha.',
      'form.photo': 'Picha ya ushahidi',
      'form.addPhoto': 'Ongeza picha',
      'form.photoHelp': 'Picha iliyopigwa mahali palipo kasoro inaweza kuwasaidia wafanyakazi kuthibitisha eneo. Wafanyakazi wanaweza kuwasiliana nawe ikiwa utatoa idhini.',
      'form.submit': 'Tuma ripoti',
      'track.eyebrow': 'UFUATILIAJI WA RIPOTI',
      'track.title': 'Fuatilia ripoti iliyotumwa',
      'track.lead': 'Weka namba ya marejeleo ya ripoti yako ili kuona hali yake ya sasa.',
      'track.check': 'Angalia hali',
      'track.placeholder': 'mfano KRR-2026-1042'
    }
  };

  function applyLanguage(language) {
    const locale = language === 'sw' ? 'sw' : 'en';
    const dictionary = translations[locale];
    document.documentElement.lang = locale === 'sw' ? 'sw' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.dataset.i18n;
      if (!dictionary[key]) return;
      if (element.hasAttribute('data-i18n-html')) element.innerHTML = dictionary[key];
      else element.textContent = dictionary[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.dataset.i18nPlaceholder;
      if (dictionary[key]) element.placeholder = dictionary[key];
    });
    const selector = document.getElementById('languageSelect');
    if (selector) selector.value = locale;
  }

  const stored = localStorage.getItem('citizenLanguage');
  applyLanguage(stored === 'sw' ? 'sw' : 'en');

  document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('languageSelect');
    if (selector) {
      selector.addEventListener('change', event => {
        const language = event.target.value;
        localStorage.setItem('citizenLanguage', language);
        applyLanguage(language);
      });
    }
  });

  window.i18n = { applyLanguage, translations };
})();
