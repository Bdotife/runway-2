export const STORAGE_KEY = 'runway-v1'

export const CHIPS = [
  'Can I spend £30 on a night out?',
  'Spent £12 on food',
  'I bought a £900 laptop with Klarna pay in 3',
  'I’ve started a part-time job earning £50 a week',
  'Spent £1,500 on a laptop and course equipment',
  'Should I buy Tesla shares?',
]

export const LALA =
  'I’ve got £5,400 available now. My next maintenance payment is £3,200 on 8 January. Rent is £650 a month, food is £55 a week and I spend around £30 a month on gym.'

export const PARTNERS: Record<string, string> = {
  NATWEST: 'NatWest',
  NATIONWIDE: 'Nationwide',
  UCL: 'UCL',
  HSBC: 'HSBC',
  SANTANDER: 'Santander',
  LLOYDS: 'Lloyds',
}

export const EXTRA_CATS = ['Going out', 'Food', 'Course & tech', 'Transport', 'Clothes', 'Subscriptions', 'Other']

export const UNIS = [
  'University College London (UCL)', 'King’s College London', 'Imperial College London',
  'London School of Economics (LSE)', 'Queen Mary University of London', 'University of Manchester',
  'University of Leeds', 'University of Birmingham', 'University of Bristol', 'University of Nottingham',
  'University of Sheffield', 'University of Warwick', 'University of Liverpool', 'Newcastle University',
  'Durham University', 'University of Exeter', 'University of Southampton', 'University of York',
  'Lancaster University', 'Loughborough University', 'University of the West of England (UWE)',
  'University of Oxford', 'University of Cambridge', 'University of Edinburgh', 'University of Glasgow',
  'Queen’s University Belfast', 'Cardiff University', 'Swansea University', 'Aberystwyth University',
  'Bangor University', 'University of Wales Trinity Saint David',
]

export const UNI_PARTNERS: Record<string, string> = { 'University College London (UCL)': 'UCL' }

export const YEARS = ['1st year', '2nd year', '3rd year', '4th year or above', 'Postgraduate', 'Apprenticeship']

export const partnerFor = (code?: string | null): string | undefined =>
  PARTNERS[String(code || '').trim().toUpperCase().replace(/\s+/g, '')]
