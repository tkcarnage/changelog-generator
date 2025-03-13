/**
 * Handles the root endpoint and returns a "Hello, World!" message.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
export const home = (req, res) => {
  res.status(200).json({ message: "Hello, World!" });
};
