// Complete modern Catholic texts are intentionally not redistributed without a license.
export const sourceLinks = {
  traditional: "https://www.fsspminneapolis.org/prayers",
  current: "https://www.usccb.org/prayers/prayers-rosary",
  contemporary: "https://www.englishtexts.org/praying-together",
};
const historical = {
  cross:
    "In the name of the Father, and of the Son, and of the Holy Ghost, Amen.",
  glory:
    "Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen.",
  father:
    "Our Father, who art in heaven, hallowed be Thy name: Thy kingdom come; Thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses as we forgive those who trespass against us: and lead us not into temptation, but deliver us from evil. Amen.",
  hail: "Hail Mary, full of grace! the Lord is with thee: blessed art thou amongst women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.",
  creed:
    "I believe in God, the Father Almighty, Creator of heaven and earth; and in Jesus Christ, His only Son, our Lord; who was conceived by the Holy Ghost, born of the Virgin Mary, suffered under Pontius Pilate, was crucified: died, and was buried. He descended into hell: the third day He arose again from the dead: He ascended into heaven, sitteth at the right hand of God, the Father Almighty; from thence He shall come to judge the living and the dead.\nI believe in the Holy Ghost the Holy Catholic Church, the communion of Saints, the forgiveness of sins, the resurrection of the body, and the life everlasting. Amen.",
};
const historicalRosary = {
  queen:
    "Hail, holy Queen, Mother of Mercy! our life, our sweetness, and our hope! To thee do we cry, poor banished children of Eve; to thee do we send up our sighs, mourning and weeping in this valley, of tears. Turn, then, most gracious Advocate, thine eyes of mercy toward us; and after this our exile show unto us the blessed fruit of thy womb, Jesus; O clement, O loving, O sweet Virgin Mary.",
  closing:
    "V. Pray for us, O holy Mother of God.\nR. That we may be made worthy of the promises of Christ.\nLet Us Pray\nO God, whose only begotten Son, by His life, death, and resurrection has purchased for us the rewards of eternal life, grant, we beseech Thee, that meditating upon these mysteries in the most holy Rosary of the Blessed Virgin Mary, we may imitate what they contain, and obtain what they promise: through the same Christ our Lord. Amen.",
};
const contemporary = {
  father:
    "Our Father in heaven,\nhallowed be your name,\nyour kingdom come,\nyour will be done,\non earth as in heaven.\nGive us today our daily bread.\nForgive us our sins\nas we forgive those who sin against us.\nSave us from the time of trial\nand deliver us from evil.\nFor the kingdom, the power, and the glory are yours\nnow and for ever. Amen.",
  glory:
    "Glory to the Father, and to the Son, and to the Holy Spirit:\nas it was in the beginning, is now, and will be for ever. Amen.",
  creed:
    "I believe in God, the Father almighty,\ncreator of heaven and earth.\nI believe in Jesus Christ, God's only Son, our Lord,\nwho was conceived by the Holy Spirit,\nborn of the Virgin Mary,\nsuffered under Pontius Pilate,\nwas crucified, died, and was buried;\nhe descended to the dead.\nOn the third day he rose again;\nhe ascended into heaven,\nhe is seated at the right hand of the Father,\nand he will come to judge the living and the dead.\nI believe in the Holy Spirit,\nthe holy catholic Church,\nthe communion of saints,\nthe forgiveness of sins,\nthe resurrection of the body,\nand the life everlasting. Amen.",
  cross:
    "In the name of the Father, the Son, and the Holy Spirit, I begin this prayer. Amen.",
  hail: "Mary, God has filled you with grace and is with you. You are blessed among women, and Jesus, your child, is blessed. Holy Mary, Mother of God, pray for us who sin, now and when we die. Amen.",
  fatima:
    "Jesus, forgive our sins. Rescue us from hell, and bring every soul to heaven. Remember especially those who need your mercy most. Amen.",
  queen:
    "Mary, holy Queen and merciful mother, you give us hope and comfort. We turn to you as children far from home, carrying our sadness and tears. Look on us with kindness. When our exile ends, bring us to Jesus, your blessed Son. Gentle, loving Virgin Mary, hear us.",
  closing:
    "Leader: Holy Mother of God, pray for us.\nResponse: Help us become worthy of what Christ has promised.\nLet us pray.\nGod, your only Son won eternal life for us through his life, death, and resurrection. As we reflect on these mysteries with Mary, help us live what they teach and receive what they promise. We ask this through Christ our Lord. Amen.",
};
export function prayerText(prayer, version) {
  if (prayer.set)
    return {
      text: `The ${["first", "second", "third", "fourth", "fifth"][prayer.index]} ${prayer.set.toLowerCase()} mystery: ${prayer.name}.`,
      note: "Original announcement prompt. Mystery names follow the USCCB rosary guide.",
      url: "https://www.usccb.org/how-to-pray-the-rosary",
    };
  if (version === "traditional" && historical[prayer.id])
    return {
      text: historical[prayer.id],
      note: `Historical Catholic text: Baltimore Catechism No. ${["cross", "glory"].includes(prayer.id) ? "3" : "1"}. Public domain in the United States; capitalization and wording retained, line wrapping normalized.`,
      url: ["cross", "glory"].includes(prayer.id)
        ? "https://www.gutenberg.org/ebooks/14553"
        : "https://www.gutenberg.org/ebooks/14551",
    };
  if (version === "traditional" && historicalRosary[prayer.id])
    return {
      text: historicalRosary[prayer.id],
      note: "Historical Catholic text: How to Say the Rosary (1937), Jeffries & Manz, Philadelphia. Public domain in the United States (published without copyright notice); transcription via Wikisource. Line wrapping normalized.",
      url: "https://en.wikisource.org/wiki/How_to_Say_the_Rosary",
    };
  if (version === "contemporary") {
    const ellc = ["father", "creed", "glory"].includes(prayer.id);
    return {
      text: contemporary[prayer.id],
      note: ellc
        ? `English translation of ${prayer.name}, © 1998 English Language Liturgical Consultation (ELLC), and used by permission. Ecumenical wording; not presented as an approved Catholic translation.`
        : "Original Share My Prayer adaptation of the customary prayer, freely reusable under CC0. Not an officially approved Catholic translation.",
      url: ellc ? "https://www.englishtexts.org/permissions" : "./SOURCES.md",
    };
  }
  return {
    text: "",
    note: "Complete text is linked rather than reproduced: app redistribution permission has not been confirmed. Open the source to read, or paste wording you have permission to use below. Your private prompt is saved only in this browser. Record the customary prayer in full; for the closing prayer include the preceding dialogue.",
    url:
      prayer.id === "closing" || prayer.id === "fatima"
        ? "https://www.usccb.org/how-to-pray-the-rosary"
        : sourceLinks[version],
  };
}
