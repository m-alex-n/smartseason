async function testConnection(prisma, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        return true;
      } catch (error) {
        console.log(`Connection attempt ${i + 1}/${retries} failed:`, error.message);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    return false;
  }
  
  module.exports = { testConnection };