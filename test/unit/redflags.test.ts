import { describe, expect, it } from 'vitest';
import { scanRedFlags } from '@/lib/rules/redflags';

const positives: [string, string][] = [
  ['en sudden severe pain', 'I had sudden severe pelvic pain this morning'],
  ['en worst pain', 'This is the worst pain of my life'],
  ['en faint with pain', 'The cramps were so bad I fainted'],
  ['en collapse pain', 'I felt a sharp pain and collapsed'],
  ['en soaking pad', 'I am soaking through a pad every hour'],
  ['en bleeding dizzy', 'The bleeding is heavy and I feel dizzy'],
  ['en pregnant pain', 'I am pregnant and I have pain in my lower belly'],
  ['en possibly pregnant bleed', 'I might be pregnant and I started bleeding'],
  ['en fever pain', 'I have a high fever and terrible belly pain'],
  ['en vomiting', 'My vomiting won\'t stop since last night'],
  ['en selfharm 1', 'Sometimes I want to die'],
  ['en selfharm 2', 'I have thoughts of suicide'],
  ['hinglish sudden', 'Achanak bahut tez pet dard shuru ho gaya'],
  ['hinglish behosh', 'Dard ki wajah se main behosh ho gayi'],
  ['hinglish pad ghanta', 'Har ghante pad badalna pad raha hai'],
  ['hinglish khoon chakkar', 'Bahut khoon aa raha hai aur chakkar aa rahe hain'],
  ['hinglish bukhar dard', 'Tez bukhar hai aur pet mein dard hai'],
  ['hinglish ulti', 'Ulti nahi ruk rahi'],
  ['hinglish selfharm', 'Mujhe jeena nahi chahti ab'],
  ['hinglish selfharm 2', 'Main khud ko khatam karna chahti hoon'],
  ['hindi selfharm', 'मैं आत्महत्या के बारे में सोच रही हूँ'],
  ['selfharm not suppressed by negation', "I don't think I want to die"],
  ['hinglish marna chahti', 'main marna chahti hu'],
  ['hinglish na filler does not suppress', 'dard na, behosh hone jaisa laga'],
  ['mentions suicidal even if hedged', 'I am not suicidal, but I keep thinking about suicide'],
  ['hindi behosh', 'दर्द इतना था कि मैं बेहोश हो गई'],
  ['hinglish pregnant', 'Main pregnant hu aur pet mein dard hai'],
];

const negatives: [string, string][] = [
  ['normal period pain', 'I get period pain every month and it is manageable'],
  ['heavy periods', 'My periods are quite heavy and I get clots'],
  ['demo story', 'Mujhe do saal se periods ke time bahut zyada pet dard hota hai, kabhi kabhi college nahi ja paati'],
  ['negated faint', 'I get cramps but no fainting at all'],
  ['fever no pain', 'I had a fever last week but it is gone'],
  ['pain no fever', 'I have pain in my pelvis around my periods'],
  ['trying to conceive', 'We are trying for a baby and I get pain during periods'],
  ['mild vomiting', 'I felt a little nauseous once'],
  ['acne hair', 'I have acne and my hair is thinning'],
  ['hinglish routine', 'Periods ke time pet dard hota hai aur painkiller leti hoon'],
  ['hinglish sex pain', 'Sex ke time bhi dard hota hai'],
  ['hinglish bleeding', 'Zyada bleeding hoti hai pehle do din'],
  ['hindi plain', 'मुझे माहवारी में पेट दर्द होता है'],
  ['dead battery', 'My phone is dead and I want to sleep'],
  ['sudden but mild', 'I suddenly noticed my periods came late'],
  ['pregnant none', 'I was told I am not planning pregnancy right now'],
  ['empty', ''],
  ['negated faint with pain', 'no fainting with the pain'],
  ['not pregnant but pain', "I'm not pregnant but I have pain"],
];

describe('red-flag scanner', () => {
  it.each(positives)('fires: %s', (_n, text) => {
    expect(scanRedFlags(text).length, text).toBeGreaterThan(0);
  });
  it.each(negatives)('does not fire: %s', (_n, text) => {
    expect(scanRedFlags(text).map((h) => h.id), text).toEqual([]);
  });
  it('self-harm is never suppressed by the negation guard (urgent flags still are)', () => {
    expect(scanRedFlags("I don't think I want to die").some((h) => h.category === 'selfharm')).toBe(true);
    expect(scanRedFlags('I felt no urge to hurt myself but I want to die').some((h) => h.category === 'selfharm')).toBe(true);
    expect(scanRedFlags('no fainting with the pain')).toEqual([]);
  });
  it('labels self-harm separately so the support card is shown', () => {
    expect(scanRedFlags('I want to die')[0].category).toBe('selfharm');
  });
  it(`has >=15 positives and >=15 negatives`, () => {
    expect(positives.length).toBeGreaterThanOrEqual(15);
    expect(negatives.length).toBeGreaterThanOrEqual(15);
  });
});
