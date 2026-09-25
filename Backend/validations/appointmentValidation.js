export const validateReviewPayload = ({ rating, comment = "" }) => {
  const parsedRating = Number(rating);

  if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
    return "Rating must be between 1 and 5";
  }

  if (String(comment).length > 1000) {
    return "Comment must be less than 1000 characters";
  }

  return null;
};
