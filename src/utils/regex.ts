// Regex for matching custom discord emoji
// First capture group is for animated emojis (whether it has an "a" in front of it or not)
// Second capture group is for the emoji name (2-32 characters long, alphanumeric and underscores only)
// Third capture group is for the emoji id (17-19 characters long only numbers)
// Example: <:pepega:123456789012345678>
export const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
