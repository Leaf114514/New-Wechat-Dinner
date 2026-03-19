// 用户授权工具：统一管理用户资料缓存，降低页面与全局状态的耦合。
const USER_PROFILE_STORAGE_KEY = "userProfile";

// 获取本地缓存的用户资料。
function getUserProfile() {
  return wx.getStorageSync(USER_PROFILE_STORAGE_KEY) || null;
}

// 保存用户资料到本地缓存。
function saveUserProfile(userProfile) {
  wx.setStorageSync(USER_PROFILE_STORAGE_KEY, userProfile);
}

// 判断当前是否已有可用的用户资料。
function hasUserProfile() {
  const userProfile = getUserProfile();

  return Boolean(
    userProfile &&
      userProfile.avatarUrl &&
      userProfile.nickName
  );
}

module.exports = {
  USER_PROFILE_STORAGE_KEY,
  getUserProfile,
  saveUserProfile,
  hasUserProfile,
};
