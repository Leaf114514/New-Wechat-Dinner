// 授权页：保持单按钮登录流程，结合官方登录与用户资料能力完成授权。
const { getUserProfile, saveUserProfile, hasUserProfile } = require("../../utils/auth");

const DEFAULT_AVATAR_URL = "../../images/avatar.png";
const LOGIN_SUCCESS_TARGET = "/pages/index/index";

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

  // 预获取登录凭证：参考文章中的单入口登录思路，先通过官方 wx.login 获取 code。
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

    this.setData({
      avatarUrl,
      showNicknameInput: true,
      buttonText: "已完成头像选择",
      tipText: "请继续填写昵称，输入完成后会自动登录。",
      stepText: "请填写昵称",
    }, () => {
      this.setData({
        nicknameInputFocused: true,
      });
    });
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

  // 执行登录：缓存用户资料后跳转到首页。
  completeLogin() {
    const { avatarUrl, nickName, loginCode, isSubmitting } = this.data;

    if (isSubmitting || avatarUrl === DEFAULT_AVATAR_URL || !nickName) {
      return;
    }

    this.setData({
      isSubmitting: true,
      stepText: "登录中...",
    });

    const userProfile = {
      avatarUrl,
      nickName,
      loginCode,
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
  },

  // 跳转首页：使用官方 switchTab 进入首页 tabBar 页面。
  navigateToHome() {
    wx.switchTab({
      url: LOGIN_SUCCESS_TARGET,
    });
  },
});
