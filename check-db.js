const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2] || "tempero-caseiro";
  console.log(`Buscando settings para slug: ${slug}`);
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug },
    include: { settings: true },
  });
  console.log(JSON.stringify(restaurant?.settings, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
