// 授权页：保持单按钮登录流程，并将用户资料同步到云端和本地缓存。
const { getUserProfile, saveUserProfile, hasUserProfile } = require("../../utils/auth");

const DEFAULT_AVATAR_URL = "../../images/avatar.png";
const LOGIN_SUCCESS_TARGET = "/pages/index/index";
const AVATAR_CLOUD_PATH_PREFIX = "user-avatar";

Page({
  data: {
    avatarUrl: DEFAULT_AVATAR_URL,
    nickName: "",
    loginCode: "",
    showNicknameInput: false,
    nicknameInputFocused: false,
    isSubmitting: false,
    buttonText: "微信授权登录",
    pageTitle: "欢迎使用点餐小程序",
    pageDesc: "登录后可同步你的头像和昵称，便于后续下单与个人信息展示。",
    tipText: "点击下方登录按钮后，按提示选择头像并填写昵称即可完成登录。",
    stepText: "点击按钮开始登录",
  },

  onLoad() {
    this.prepareLoginCode();
  },

  onShow() {
    if (!hasUserProfile()) {
      return;
    }

    const userProfile = getUserProfile();

    getApp().setUserProfile(userProfile);
    this.navigateToHome();
  },

  // 预获取登录凭证：用于校验当前登录链路已完成基础授权准备。
  prepareLoginCode() {
    wx.login({
      success: ({ code }) => {
        if (!code) {
          this.prepareLoginCode();
          return;
        }

        this.setData({
          loginCode: code,
        });
      },
      fail: () => {
        wx.showToast({
          title: "登录凭证获取失败",
          icon: "none",
        });
      },
    });
  },

  // 头像选择事件：使用官方 chooseAvatar 能力更新头像，并进入昵称填写步骤。
  onChooseAvatar(event) {
    const { avatarUrl } = event.detail;

    if (!avatarUrl) {
      return;
    }

    this.setData(
      {
        avatarUrl,
        showNicknameInput: true,
        buttonText: "已完成头像选择",
        tipText: "请继续填写昵称，输入完成后会自动登录。",
        stepText: "请填写昵称",
      },
      () => {
        this.setData({
          nicknameInputFocused: true,
        });
      }
    );
  },

  // 昵称输入事件：使用官方昵称输入能力同步昵称内容。
  onNicknameInput(event) {
    this.setData({
      nickName: event.detail.value.trim(),
    });
  },

  // 昵称确认事件：用户完成昵称填写后自动执行登录。
  onNicknameConfirm(event) {
    this.setData({
      nickName: event.detail.value.trim(),
      nicknameInputFocused: false,
    });

    this.completeLogin();
  },

  // 昵称失焦事件：兼容键盘收起场景，避免用户输入后还要额外点按钮。
  onNicknameBlur(event) {
    this.setData({
      nickName: event.detail.value.trim(),
      nicknameInputFocused: false,
    });

    this.completeLogin();
  },

  // 执行登录：上传头像并通过云函数写入数据库，然后缓存到本地。
  async completeLogin() {
    const { avatarUrl, nickName, loginCode, isSubmitting } = this.data;

    if (isSubmitting || avatarUrl === DEFAULT_AVATAR_URL || !nickName) {
      return;
    }

    if (!loginCode) {
      this.prepareLoginCode();
      wx.showToast({
        title: "登录凭证准备中",
        icon: "none",
      });
      return;
    }

    this.setData({
      isSubmitting: true,
      stepText: "登录中...",
    });

    try {
      const avatarFileId = await this.uploadAvatarToCloud(avatarUrl);
      const cloudResult = await this.upsertUserProfile({
        nickName,
        avatarFileId,
      });
      const userProfile = {
        openid: cloudResult.userProfile?.openid || "",
        nickName,
        avatarUrl,
        avatarFileId,
        updatedAt: Date.now(),
      };

      saveUserProfile(userProfile);
      getApp().setUserProfile(userProfile);

      wx.showToast({
        title: "登录成功",
        icon: "success",
      });

      setTimeout(() => {
        this.navigateToHome();
      }, 300);
    } catch (error) {
      console.error("completeLogin error", error);
      this.setData({
        isSubmitting: false,
        stepText: "登录失败，请重试",
        buttonText: "微信授权登录",
      });
      this.prepareLoginCode();
      wx.showToast({
        title: error.message && error.message.includes("云环境") ? "请先配置云环境" : "登录失败，请重试",
        icon: "none",
      });
    }
  },

  // 上传头像到云存储：避免本地临时路径失效后无法展示头像。
  uploadAvatarToCloud(localAvatarUrl) {
    const app = getApp();

    if (!wx.cloud || !app.globalData.env) {
      return Promise.reject(new Error("云环境未配置"));
    }

    const fileExtension = this.getFileExtension(localAvatarUrl);
    const cloudPath = `${AVATAR_CLOUD_PATH_PREFIX}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.${fileExtension}`;

    return wx.cloud.uploadFile({
      cloudPath,
      filePath: localAvatarUrl,
    }).then((uploadResult) => uploadResult.fileID);
  },

  // 写入用户资料：通过云函数将昵称和云头像文件写入数据库。
  upsertUserProfile(profileData) {
    return wx.cloud
      .callFunction({
        name: "quickstartFunctions",
        data: {
          type: "upsertUserProfile",
          data: profileData,
        },
      })
      .then((result) => {
        if (!result.result?.success) {
          throw new Error(result.result?.errMsg || "用户资料同步失败");
        }

        return result.result;
      });
  },

  // 获取文件扩展名：确保头像上传后保留可识别的文件后缀。
  getFileExtension(filePath) {
    const matchedResult = /\.([^.?#/]+)(?:[?#].*)?$/.exec(filePath);

    return matchedResult ? matchedResult[1].toLowerCase() : "png";
  },

  // 跳转首页：使用官方 switchTab 进入首页 tabBar 页面。
  navigateToHome() {
    wx.switchTab({
      url: LOGIN_SUCCESS_TARGET,
    });
  },
});