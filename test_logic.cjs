function testUser(user) {
  if (!user) {
    return "returned early";
  }
  if (!user.profileCompleted) {
    return "profile not completed";
  }
  return "ok";
}
console.log("null:", testUser(null));
console.log("undefined:", testUser(undefined));
console.log("empty object:", testUser({}));
try {
  testUser(null);
} catch (e) {
  console.log("Error:", e.message);
}
