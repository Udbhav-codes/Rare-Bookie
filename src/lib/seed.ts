import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";
import { addDays, todayISO } from "./utils";

type SeedBook = [title: string, author: string, isbn: string, year: number, rack: string, copies: number, description: string];

const CATALOGUE: Record<string, SeedBook[]> = {
  Fiction: [
    ["To Kill a Mockingbird", "Harper Lee", "9780061120084", 1960, "R1", 3, "A lawyer in 1930s Alabama defends a Black man falsely accused, seen through the eyes of his young daughter."],
    ["1984", "George Orwell", "9780451524935", 1949, "R1", 3, "A clerk in a surveillance state quietly begins to doubt the Party that rewrites history every day."],
    ["Pride and Prejudice", "Jane Austen", "9780141439518", 1813, "R1", 2, "Elizabeth Bennet and Mr Darcy misjudge each other across ballrooms and country estates."],
    ["The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", 1925, "R1", 2, "A mysterious millionaire throws lavish parties on Long Island, hoping one guest will notice."],
    ["The Alchemist", "Paulo Coelho", "9780062315007", 1988, "R2", 4, "A shepherd boy leaves Andalusia to follow a recurring dream to the pyramids of Egypt."],
    ["The God of Small Things", "Arundhati Roy", "9780812979657", 1997, "R2", 2, "Twins in Kerala piece together the day their family's rules about love were broken."],
    ["The Kite Runner", "Khaled Hosseini", "9781594631931", 2003, "R2", 2, "A friendship in Kabul is broken by one act of cowardice that shadows the rest of a life."],
    ["Midnight's Children", "Salman Rushdie", "9780812976533", 1981, "R2", 1, "A boy born at the stroke of India's independence discovers his fate is tied to the nation's."],
    ["The Hobbit", "J.R.R. Tolkien", "9780547928227", 1937, "R3", 3, "Bilbo Baggins is swept out of his comfortable hole and into a quest for a dragon's gold."],
    ["One Hundred Years of Solitude", "Gabriel García Márquez", "9780060883287", 1967, "R3", 1, "Seven generations of the Buendía family rise and fall in the town of Macondo."],
    ["The White Tiger", "Aravind Adiga", "9781416562603", 2008, "R3", 2, "A driver from a Bihar village narrates his darkly funny climb out of servitude."],
    ["Malgudi Days", "R.K. Narayan", "9780143039655", 1943, "R3", 2, "Short stories of shopkeepers, astrologers and schoolboys in a small South Indian town."],
  ],
  "Non-fiction": [
    ["Sapiens", "Yuval Noah Harari", "9780062316097", 2011, "R4", 3, "How a modest ape came to run the planet, from the cognitive revolution to capitalism."],
    ["Atomic Habits", "James Clear", "9780735211292", 2018, "R4", 3, "A practical system for building good habits by making tiny changes that compound."],
    ["Thinking, Fast and Slow", "Daniel Kahneman", "9780374533557", 2011, "R4", 1, "The two systems that drive how we think, and the predictable errors each one makes."],
    ["Wings of Fire", "A.P.J. Abdul Kalam", "9788173711466", 1999, "R7", 3, "The autobiography of India's missile scientist and president, from Rameswaram onwards."],
    ["Educated", "Tara Westover", "9780399590504", 2018, "R7", 2, "Raised off-grid in Idaho without school, a girl teaches herself her way to Cambridge."],
    ["The Diary of a Young Girl", "Anne Frank", "9780553296983", 1947, "R7", 2, "The diary kept by a Jewish teenager hiding from the Nazis in an Amsterdam annexe."],
    ["Quiet", "Susan Cain", "9780307352156", 2012, "R7", 1, "Why introverts are undervalued in a world that rewards talking, and what they offer."],
  ],
  Science: [
    ["A Brief History of Time", "Stephen Hawking", "9780553380163", 1988, "R5", 2, "Black holes, the big bang and the nature of time, explained for curious non-physicists."],
    ["Cosmos", "Carl Sagan", "9780345539434", 1980, "R5", 2, "A tour of the universe and of the scientists who slowly worked out our place in it."],
    ["The Selfish Gene", "Richard Dawkins", "9780198788607", 1976, "R5", 1, "Evolution retold from the point of view of the gene rather than the organism."],
    ["The Gene", "Siddhartha Mukherjee", "9781476733500", 2016, "R5", 1, "The history of genetics, woven with the author's own family story of mental illness."],
    ["The Emperor of All Maladies", "Siddhartha Mukherjee", "9781439170915", 2010, "R6", 1, "A biography of cancer, from ancient Egypt to modern chemotherapy wards."],
    ["Silent Spring", "Rachel Carson", "9780618249060", 1962, "R6", 1, "The book that exposed the damage pesticides do and started the environmental movement."],
    ["Astrophysics for People in a Hurry", "Neil deGrasse Tyson", "9780393609394", 2017, "R6", 2, "The essentials of the universe in short chapters you can read on a commute."],
  ],
  History: [
    ["Guns, Germs, and Steel", "Jared Diamond", "9780393354324", 1997, "R8", 2, "Why some societies conquered others: geography, crops and animals, not destiny."],
    ["The Discovery of India", "Jawaharlal Nehru", "9780143031031", 1946, "R8", 2, "Written in prison, Nehru's sweeping account of India's past and its idea of itself."],
    ["India After Gandhi", "Ramachandra Guha", "9780060958589", 2007, "R8", 1, "The story of the world's largest democracy from 1947 to the present day."],
    ["The Silk Roads", "Peter Frankopan", "9781101912379", 2015, "R9", 1, "World history retold from the trade routes linking East and West."],
    ["SPQR", "Mary Beard", "9781631492228", 2015, "R9", 1, "A thousand years of ancient Rome, from its myths to its citizens' everyday lives."],
    ["The Guns of August", "Barbara W. Tuchman", "9780345476098", 1962, "R9", 1, "The first month of the First World War, and the decisions that made it unstoppable."],
  ],
  Children: [
    ["Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "9780590353427", 1997, "R10", 4, "An orphan discovers on his eleventh birthday that he is a wizard."],
    ["Charlotte's Web", "E.B. White", "9780064400558", 1952, "R10", 2, "A clever spider spins words into her web to save her friend Wilbur the pig."],
    ["The Little Prince", "Antoine de Saint-Exupéry", "9780156012195", 1943, "R10", 2, "A stranded pilot meets a small traveller from a tiny asteroid with a single rose."],
    ["Matilda", "Roald Dahl", "9780142410370", 1988, "R11", 2, "A brilliant girl with awful parents and a worse headmistress finds she has special powers."],
    ["Where the Wild Things Are", "Maurice Sendak", "9780060254926", 1963, "R11", 1, "Sent to bed without supper, Max sails away to where the wild things are."],
    ["The Very Hungry Caterpillar", "Eric Carle", "9780399226908", 1969, "R11", 2, "A caterpillar eats its way through the week before becoming a butterfly."],
  ],
  Reference: [
    ["Concise Oxford English Dictionary", "Oxford Languages", "9780199601080", 2011, "R12", 2, "Definitions, spellings and usage notes for over 240,000 words and phrases."],
    ["The Elements of Style", "William Strunk Jr. & E.B. White", "9780205309023", 1959, "R12", 1, "The short classic guide to writing clear, concise English."],
    ["Merriam-Webster's Collegiate Dictionary", "Merriam-Webster", "9780877798095", 2003, "R12", 1, "The standard American desk dictionary, with pronunciations and word histories."],
  ],
};

// [book title, borrower index, lent days ago, loan length, returned days ago | null, condition]
const LOANS: [string, number, number, number, number | null, string | null][] = [
  ["The Alchemist", 0, 20, 14, null, null], // overdue
  ["Wings of Fire", 1, 17, 14, null, null], // overdue
  ["Sapiens", 2, 12, 14, null, null], // due soon
  ["Harry Potter and the Sorcerer's Stone", 3, 5, 14, null, null],
  ["1984", 4, 3, 14, null, null],
  ["The Hobbit", 5, 2, 14, null, null],
  ["Atomic Habits", 6, 1, 14, null, null],
  ["To Kill a Mockingbird", 2, 40, 14, 28, "Good"],
  ["Cosmos", 1, 35, 14, 22, "Good"],
  ["Matilda", 3, 30, 14, 19, "Good"],
  ["The Alchemist", 6, 26, 14, 13, "Good"],
  ["The Discovery of India", 4, 24, 14, 9, "Damaged"],
  ["Charlotte's Web", 5, 15, 14, 4, "Good"],
  ["Sapiens", 0, 16, 14, 2, "Good"],
  ["The Little Prince", 7, 6, 14, 0, "Good"],
];

const BORROWERS: [name: string, member: string, phone: string, email: string | null, address: string | null][] = [
  ["Aarav Mehta", "M-1024", "98200 11234", "aarav.mehta@example.com", "Class 10-B"],
  ["Priya Nair", "M-1031", "98450 55120", null, "Staff — Science Dept."],
  ["Kabir Singh", "M-1047", "99870 33419", "kabir.s@example.com", null],
  ["Ananya Rao", "M-1052", "90040 72211", null, "Class 7-A"],
  ["Rohan Desai", "M-1060", "98193 84420", "rohan.desai@example.com", null],
  ["Meera Iyer", "M-1063", "97690 11873", null, "Class 12-C"],
  ["Vikram Joshi", "M-1071", "98331 90456", "vikram.j@example.com", "Staff — Admin"],
  ["Sara Khan", "M-1078", "90290 66731", null, "Class 5-B"],
];

export function seedIfEmpty(d: DatabaseSync) {
  const hasSettings = d.prepare("SELECT COUNT(*) AS n FROM settings").get() as { n: number };
  if (hasSettings.n > 0) return;

  d.exec("BEGIN");
  try {
    const setting = d.prepare("INSERT INTO settings(key, value) VALUES (?, ?)");
    setting.run("library_name", "Rare Bookie");
    setting.run("default_loan_days", "14");
    setting.run("rack_rows", "4");

    d.prepare("INSERT INTO admins(name, email, password_hash) VALUES (?, ?, ?)").run(
      process.env.ADMIN_NAME || "Librarian",
      process.env.ADMIN_EMAIL || "admin@rarebookie.local",
      hashPassword(process.env.ADMIN_PASSWORD || "rarebookie"),
    );

    const today = todayISO();
    const now = Date.now();
    const insertCat = d.prepare("INSERT INTO categories(name) VALUES (?)");
    const insertBook = d.prepare(
      `INSERT INTO books(title, author, isbn, category_id, year, language, description, rack_number, total_copies, available_copies, created_at)
       VALUES (?, ?, ?, ?, ?, 'English', ?, ?, ?, ?, ?)`,
    );
    const bookIds = new Map<string, number>();
    let order = 0;
    for (const [category, books] of Object.entries(CATALOGUE)) {
      const catId = Number(insertCat.run(category).lastInsertRowid);
      for (const [title, author, isbn, year, rack, copies, description] of books) {
        // Stagger created_at so "new arrivals" and "added this month" have something to show.
        const created = new Date(now - (41 - order++) * 86_400_000 * 1.6).toISOString();
        const id = insertBook.run(title, author, isbn, catId, year, description, rack, copies, copies, created).lastInsertRowid;
        bookIds.set(title, Number(id));
      }
    }

    const insertBorrower = d.prepare("INSERT INTO borrowers(name, member_id, phone, email, address) VALUES (?, ?, ?, ?, ?)");
    const borrowerIds = BORROWERS.map((b) => Number(insertBorrower.run(...b).lastInsertRowid));

    const insertLoan = d.prepare(
      `INSERT INTO loans(book_id, book_title, borrower_id, lend_date, due_date, return_date, status, condition_on_return, created_at, returned_at, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    );
    const decrement = d.prepare("UPDATE books SET available_copies = available_copies - 1 WHERE id = ?");
    for (const [title, who, lentAgo, length, returnedAgo, condition] of LOANS) {
      const bookId = bookIds.get(title)!;
      const lend = addDays(today, -lentAgo);
      const returned = returnedAgo === null ? null : addDays(today, -returnedAgo);
      const createdAt = new Date(now - lentAgo * 86_400_000 - 3_600_000 * (3 + (bookId % 5))).toISOString();
      const returnedAt = returnedAgo === null ? null : new Date(now - returnedAgo * 86_400_000 - 3_600_000 * (1 + (bookId % 3))).toISOString();
      insertLoan.run(
        bookId,
        title,
        borrowerIds[who],
        lend,
        addDays(lend, length),
        returned,
        returned ? "returned" : "active",
        condition,
        createdAt,
        returnedAt,
      );
      if (!returned) decrement.run(bookId);
    }
    d.exec("COMMIT");
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}
