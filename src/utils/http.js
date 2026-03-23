export const resolveStatusCode = (message, rules, fallback = 500) => {
  const matchedRule = rules.find((rule) => rule.when(message));
  return matchedRule ? matchedRule.status : fallback;
};
