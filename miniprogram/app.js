// app.js
const { getUserProfile, hasUserProfile } = require("./utils/auth");

App({
  onLaunch: function () {
    const storedUserProfile = getUserProfile();

    this.globalData = {
      // env 参数说明：
      // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会请求到哪个云环境的资源
      // 此处请填入环境 ID, 环境 ID 可在微信开发者工具右上顶部工具栏点击云开发按钮打开获取
      env: "cloud1-2gj8viqpaf4a9ff5",
      // userProfile 用于保存已授权的微信头像和昵称。
      userProfile: storedUserProfile,
      // hasUserProfile 用于标记当前是否已经完成授权。
      hasUserProfile: hasUserProfile(),
    };
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },
  // 统一更新全局用户资料，减少页面间直接耦合。
  setUserProfile(userProfile) {
    this.globalData.userProfile = userProfile;
    this.globalData.hasUserProfile = Boolean(
      userProfile &&
        userProfile.nickName &&
        (userProfile.avatarFileId || userProfile.avatarUrl)
    );
  },
});