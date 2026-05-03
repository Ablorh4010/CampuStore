
import { db } from "../server/db";
import { categories } from "../shared/schema";
import { eq } from "drizzle-orm";

const categoryData = [
  {
    name: "Electronics",
    icon: "fas fa-laptop",
    color: "blue-100",
    subcategories: [
      { name: "Laptops", icon: "fas fa-laptop", color: "blue-100" },
      { name: "Smartphones", icon: "fas fa-mobile", color: "blue-100" },
      { name: "Headphones", icon: "fas fa-headphones", color: "blue-100" },
      { name: "Accessories", icon: "fas fa-plug", color: "blue-100" },
    ],
  },
  {
    name: "Academic",
    icon: "fas fa-book",
    color: "yellow-100",
    subcategories: [
      { name: "Textbooks", icon: "fas fa-book", color: "yellow-100" },
      { name: "Stationery", icon: "fas fa-pen", color: "yellow-100" },
      { name: "Lab Gear", icon: "fas fa-microscope", color: "yellow-100" },
    ],
  },
  {
    name: "Fashion",
    icon: "fas fa-tshirt",
    color: "pink-100",
    subcategories: [
      { name: "Clothing", icon: "fas fa-tshirt", color: "pink-100" },
      { name: "Shoes", icon: "fas fa-shoe-prints", color: "pink-100" },
      { name: "Accessories", icon: "fas fa-hat-cowboy", color: "pink-100" },
    ],
  },
  {
    name: "Home & Dorm",
    icon: "fas fa-home",
    color: "green-100",
    subcategories: [
      { name: "Furniture", icon: "fas fa-chair", color: "green-100" },
      { name: "Kitchenware", icon: "fas fa-utensils", color: "green-100" },
      { name: "Bedding", icon: "fas fa-bed", color: "green-100" },
    ],
  },
  {
    name: "Sports & Leisure",
    icon: "fas fa-football",
    color: "red-100",
    subcategories: [
      { name: "Gym Gear", icon: "fas fa-dumbbell", color: "red-100" },
      { name: "Musical Instruments", icon: "fas fa-music", color: "red-100" },
      { name: "Games", icon: "fas fa-gamepad", color: "red-100" },
    ],
  },
  {
    name: "Services",
    icon: "fas fa-graduation-cap",
    color: "purple-100",
    subcategories: [
      { name: "Tutoring", icon: "fas fa-user-graduate", color: "purple-100" },
      { name: "Delivery", icon: "fas fa-car", color: "purple-100" },
      { name: "Hair & Beauty", icon: "fas fa-heart", color: "purple-100" },
    ],
  },
];

async function seed() {
  console.log("Seeding categories...");

  for (const cat of categoryData) {
    // Check if category exists
    let [existingCat] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, cat.name));

    if (!existingCat) {
      [existingCat] = await db
        .insert(categories)
        .values({
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
        })
        .returning();
      console.log(`Created category: ${cat.name}`);
    } else {
      console.log(`Category already exists: ${cat.name}`);
    }

    for (const sub of cat.subcategories) {
      const [existingSub] = await db
        .select()
        .from(categories)
        .where(eq(categories.name, sub.name));

      if (!existingSub) {
        await db.insert(categories).values({
          name: sub.name,
          icon: sub.icon,
          color: sub.color,
          parentId: existingCat.id,
        });
        console.log(`  Created subcategory: ${sub.name}`);
      } else {
        console.log(`  Subcategory already exists: ${sub.name}`);
      }
    }
  }

  console.log("Seeding completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
