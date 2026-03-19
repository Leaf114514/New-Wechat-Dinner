// 我的页面：展示当前登录用户的基础资料，便于后续扩展个人中心模块。
const { getUserProfile, hasUserProfile } = require("../../utils/auth");

const DEFAULT_AVATAR_URL = "../../images/avatar.png";

Page({
  data: {
    avatarUrl: DEFAULT_AVATAR_URL,
    nickName: "未登录",
    statusText: "当前未读取到登录信息",
  },

  onShow() {
    this.syncUserProfile();
  },

  // 同步用户资料：优先读取本地缓存，并同步到全局状态。
  syncUserProfile() {
    if (!hasUserProfile()) {
      this.setData({
        avatarUrl: DEFAULT_AVATAR_URL,
        nickName: "未登录",
        statusText: "请先前往登录页完成授权登录",
      });
      return;
    }

    const userProfile = getUserProfile();

    getApp().setUserProfile(userProfile);
    this.setData({
      avatarUrl: userProfile.avatarUrl,
      nickName: userProfile.nickName,
      statusText: "已同步当前微信头像和昵称",
    });
  },
});