import fs from 'fs';

// 1. הגדרות — מפתח Serper נטען ממשתנה סביבה כדי שלא יישמר בקוד הציבורי
//    הרצה: SERPER_API_KEY=xxx node find_pictures.js
const API_KEY = process.env.SERPER_API_KEY;
if (!API_KEY) {
  console.error('❌ Set SERPER_API_KEY env var before running.');
  process.exit(1);
}
const CATEGORY_NAME = 'drinks';

const itemsList = [
  "Coffee Cup", "Glass of Tea", "Orange Juice glass", "Apple Juice glass", "Hot Chocolate",
  "Iced Coffee", "Slushie Drink", "Sheridans Liqueur", "Arak Bottle", "Glass of Water",
  "Soda Water", "Coca Cola Bottle", "Red Wine Glass", "Beer Mug", "Champagne Flute",
  "Milk Carton", "Lemonade Glass", "Espresso Cup", "Cappuccino", "Smoothie",
  "Tomato Juice", "Whiskey Glass", "Vodka Bottle", "Gin and Tonic", "Cocktail Shaker",
  "Tequila Shot", "Energy Drink", "Coconut Water", "Green Tea", "Mint Tea",
  "Grape Juice", "Ice Cubes", "Paper Straw", "Thermos Flask", "Bottle Opener",
  "Wine Corkscrew", "Cider bottle", "Hot Cider", "Milkshake", "Espresso Beans"
];

async function fetchOnlineImages() {
  const resultJson = {};
  console.log(`מחלץ קישורים חיים עבור: ${CATEGORY_NAME}...`);

  for (const item of itemsList) {
    try {
      const searchQuery = `${item} product isolated white background`;

      const response = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: {
          'X-API-KEY': API_KEY, // המפתח של Serper חייב להיות כאן
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: searchQuery,
          gl: "il", // חיפוש בישראל
          hl: "en"  // ממשק בעברית עוזר למצוא תוצאות מקומיות
        })
      });

      const data = await response.json();

      // אם יש שגיאת מפתח, Serper יחזיר אובייקט עם שדה message
      if (data.message) {
        console.error(`❌ שגיאת API: ${data.message}`);
        break;
      }

      if (data.images && data.images.length > 0) {
        resultJson[item] = data.images[0].imageUrl;
        console.log(`✅ קישור נמצא עבור: ${item}`);
      } else {
        resultJson[item] = "IMAGE_NOT_FOUND";
        console.log(`❌ לא נמצאה תמונה עבור: ${item}`);
      }

      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error) {
      console.error(`שגיאה בפריט ${item}:`, error.message);
      resultJson[item] = "ERROR";
    }
  }

  fs.writeFileSync(`${CATEGORY_NAME}_online.json`, JSON.stringify(resultJson, null, 2));
  console.log(`\n✨ הקובץ ${CATEGORY_NAME}_online.json מוכן!`);
}

fetchOnlineImages();