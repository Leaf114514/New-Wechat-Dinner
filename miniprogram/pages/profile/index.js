// 我的页面：展示当前登录用户的基础资料，并支持退出登录。
const {
  getUserProfile,
  saveUserProfile,
  clearUserProfile,
  hasUserProfile,
} = require("../../utils/auth");

const DEFAULT_AVATAR_URL = "../../images/avatar.png";
const AUTH_PAGE_PATH = "/pages/auth/index";

Page({
  data: {
    avatarUrl: DEFAULT_AVATAR_URL,
    nickName: "未登录",
    statusText: "当前未读取到登录信息",
  },

  async onShow() {
    await this.syncUserProfile();
  },

  // 同步用户资料：优先读取本地缓存，再尝试读取云端最新资料。
  async syncUserProfile() {
    if (!hasUserProfile()) {
      this.applyGuestProfile();
      return;
    }

    const localUserProfile = getUserProfile();
    let mergedUserProfile = localUserProfile;

    try {
      const cloudResult = await this.fetchUserProfileFromCloud();

      if (cloudResult?.userProfile) {
        mergedUserProfile = {
          ...localUserProfile,
          ...cloudResult.userProfile,
        };
        saveUserProfile(mergedUserProfile);
        getApp().setUserProfile(mergedUserProfile);
      }
    } catch (error) {
      console.error("syncUserProfile error", error);
    }

    const avatarUrl = await this.resolveAvatarUrl(mergedUserProfile);

    this.setData({
      avatarUrl,
      nickName: mergedUserProfile.nickName,
      statusText: "已同步当前微信头像和昵称",
    });
  },

  // 获取云端资料：通过云函数按 openid 读取当前用户资料。
  fetchUserProfileFromCloud() {
    const app = getApp();

    if (!wx.cloud || !app.globalData.env) {
      return Promise.resolve(null);
    }

    return wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "getUserProfile",
        },
      })
      .then((result) => (result.result?.success ? result.result : null));
  },

  // 解析头像地址：优先将云文件 fileID 转成可展示的临时地址。
  async resolveAvatarUrl(userProfile) {
    if (!userProfile) {
      return DEFAULT_AVATAR_URL;
    }

    if (!userProfile.avatarFileId || !wx.cloud) {
      return userProfile.avatarUrl || DEFAULT_AVATAR_URL;
    }

    try {
      const tempUrlResult = await wx.cloud.getTempFileURL({
        fileList: [userProfile.avatarFileId],
      });
      const tempFileInfo = tempUrlResult.fileList?.[0];

      if (tempFileInfo?.tempFileURL) {
        return tempFileInfo.tempFileURL;
      }
    } catch (error) {
      console.error("resolveAvatarUrl error", error);
    }

    return userProfile.avatarUrl || DEFAULT_AVATAR_URL;
  },

  // 退出登录：仅清理本地登录态，并回到授权登录页重新登录。
  handleLogout() {
    wx.showModal({
      title: "退出登录",
      content: "退出后需要重新授权登录，是否继续？",
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }

        clearUserProfile();
        getApp().setUserProfile(null);
        this.applyGuestProfile();
        wx.reLaunch({
          url: AUTH_PAGE_PATH,
        });
      },
    });
  },

  // 设置未登录态页面数据。
  applyGuestProfile() {
    this.setData({
      avatarUrl: DEFAULT_AVATAR_URL,
      nickName: "未登录",
      statusText: "请先前往登录页完成授权登录",
    });
  },
});