// Import the User models
const User = require("../models/User");

// Import bcrypt to compare passwords
const { compare } = require("bcrypt");

// Import the JSON Web Token middleware functions
const {
  genUserToken,
  verifyUserToken,
  authUserToken,
} = require("../middleware/jwt");
const error = require("jsonwebtoken/lib/JsonWebTokenError");

/**
 * @route   POST /auth/register
 * @desc    Register a new user.
 * @requires Email and password
 * @optional First name, last name, weight, height, activity level
 * @access  Public
 */

const register = async (req, res, next) => {
  // attempt to register new user
  // get email and password from request body
  const { email, password } = req.body;
  // make sure they provide email and password
  if (!email || !password)
    return res.status(400).json({
      status: "failed",
      data: [],
      message: "Invalid email or password.",
    });

  // ahmed's implementation from app.js, this should also check if it exists but i havent tested yet tho
  // mongoose Model.findOne() no longer accepts a callback apparently, so needed to change slightly - dennis
  try {
    // create new user
    const user = new User({ email, password });

    // check if user already exists
    const userExists = await User.findOne({ email: email });
    if (userExists) {
      return res.status(400).json({
        status: "failed",
        data: [],
        message: "User already exists.",
      });
    }

    // check for optional fields
    if (req.body.firstName) user.firstName = req.body.firstName;
    if (req.body.lastName) user.lastName = req.body.lastName;
    if (req.body.weight) user.weight = req.body.weight;
    if (req.body.height) user.height = req.body.height;
    if (req.body.activityLevel) user.activityLevel = req.body.activityLevel;
    if (req.body.age) user.age = req.body.age;
    if (req.body.sex) user.sex = req.body.sex;

    try {
      user.validate(); // validate user before saving
    } catch (error) {
      return res.status(400).json({
        // this will be an error due to improper optional fields
        status: "failed",
        data: [],
        message: error.message,
      });
    }

    // save user to database
    await user.save();
    res.status(201).json({
      status: "success",
      data: [],
      message: "User created.",
    });
  } catch (error) {
    return res.status(500).json({
      // internal error
      status: "failed",
      data: [],
      message: error.message,
    });
  }

  res.end(); // just for safety
  // either return user to login page or actually log them in and take to dashboard?
};

/**
 * @route   POST /auth/login
 * @desc    Login a user.
 * @requires Email and password
 * @optional None
 * @access  Public
 */
const login = async (req, res, next) => {
  // make sure email and password are provided
  const { email, password } = req.body;
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({
      status: "failed",
      data: [],
      message: "Email and password required.",
    });
  }

  // find user in database
  const user = await User.findOne({ email: email }).select("+password"); // force select password w/ +
  if (!user) {
    // user not found
    return res.status(400).json({
      status: "failed",
      data: [],
      message: "User not found.",
    });
  }

  // now have user, compare passwords using bcrypt
  match = await compare(password, user.password);
  if (!match) {
    return res.status(400).json({
      status: "failed",
      data: [],
      message: "Invalid password.",
    });
  }

  // generate token and send to user
  const token = genUserToken(user);
  res.cookie("token", token, {
    maxAge: 60 * 60 * 1000, // 1 hour
    httpOnly: true,
    secure: true,
    SameSite: "None", // for cross-site cookies
  });

  // might want to send more data back?
  res.status(200).json({
    status: "success",
    data: [{ email: user.email, id: user._id, token: token }],
    message: "User logged in.",
  });
  res.end(); // just for safety
};

// have not tested below functions - dennis

const logout = async (req, res, next) => {
  // attempted to force jwt to expire
  // tried implementing, let me know how goofy it is - ahmed
  try {
    res.cookie("token", "none", {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res
      .status(200)
      .json({ status: "success", data: [], message: "User logged out" });
  } catch (error) {
    res
      .status(400)
      .json({ status: "failed", data: [], message: error.message });
  }
};

const reset = async (req, res, next) => {
  //this ones big and i have no clue if it works - ahmed
  try {
    // token checking
    // first if statement makes sure the token exists, second checks if it is valid, third checks to make sure it applies to a user
    if (!req.headers.authorization?.split(" ")[1]) {
      return res
        .status(401)
        .json({ status: "failed", data: [], message: "no jwt access token" });
    }
    const decoded = verifyUserToken(req.headers.authorization?.split(" ")[1]);
    if (!decoded) {
      return res
        .status(401)
        .json({ status: "failed", data: [], message: "invalid token" });
    }
    const user = User.findById(decoded.id);
    if (!(await user)) {
      return res
        .status(404)
        .json({ status: "failed", data: [], message: "no user exists" });
    }

    // password checking
    // first if statement checks for input of old and new passwords, second checks they arent the same (idk how user knows old password)
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        status: "failed",
        data: [],
        message: "missing password change",
      });
    }
    if (!(await compare.compare(oldPassword, newPassword))) {
      return res.status(401).json({
        status: "failed",
        data: [],
        message: "invalid password change",
      });
    }

    // actually changing password
    // actually applying the change to the database needs the pre-save hook which we dont seem to have yet?
    user.password = newPassword;
    // await user.save(); // line that requires the pre-save hook
    return res.status(200).json({
      status: "success",
      data: [],
      messages: "completed password change",
    });
  } catch {
    console.error(err); //debugging
    return res
      .status(500)
      .json({ status: "failed", data: [], message: error.message });
  }
};

module.exports = {
  register,
  login,
  logout,
  reset,
};
