const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
const USER_PROFILE_COLLECTION = "userProfiles";

// 确保集合存在：首次写入用户资料时自动创建集合。
const ensureCollectionExists = async (collectionName) => {
  try {
    await db.createCollection(collectionName);
  } catch (error) {
    const errorText = `${error.errMsg || error.message || ""}`;

    if (!errorText.includes("already exists")) {
      console.log(`createCollection skip: ${collectionName}`, error);
    }
  }
};

// 获取 openid。
const getOpenId = async () => {
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码。
const getMiniProgramCode = async () => {
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建示例集合。
const createCollection = async () => {
  try {
    await db.createCollection("sales");
    await db.collection("sales").add({
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询示例数据。
const selectRecord = async () => {
  return await db.collection("sales").get();
};

// 更新示例数据。
const updateRecord = async (event) => {
  try {
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (error) {
    return {
      success: false,
      errMsg: error,
    };
  }
};

// 新增示例数据。
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (error) {
    return {
      success: false,
      errMsg: error,
    };
  }
};

// 删除示例数据。
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      errMsg: error,
    };
  }
};

// 写入用户资料：按 openid 更新或新增用户资料记录。
const upsertUserProfile = async (event) => {
  try {
    const wxContext = cloud.getWXContext();
    const { nickName = "", avatarFileId = "" } = event.data || {};

    if (!nickName || !avatarFileId) {
      return {
        success: false,
        errMsg: "nickName and avatarFileId are required",
      };
    }

    await ensureCollectionExists(USER_PROFILE_COLLECTION);
    const userProfileCollection = db.collection(USER_PROFILE_COLLECTION);
    const existingResult = await userProfileCollection
      .where({
        openid: wxContext.OPENID,
      })
      .limit(1)
      .get();

    const userProfileData = {
      openid: wxContext.OPENID,
      nickName,
      avatarFileId,
      updatedAt: db.serverDate(),
    };

    if (existingResult.data.length) {
      const existingRecord = existingResult.data[0];

      await userProfileCollection.doc(existingRecord._id).update({
        data: userProfileData,
      });

      return {
        success: true,
        userProfile: {
          _id: existingRecord._id,
          openid: wxContext.OPENID,
          nickName,
          avatarFileId,
        },
      };
    }

    const addResult = await userProfileCollection.add({
      data: {
        ...userProfileData,
        createdAt: db.serverDate(),
      },
    });

    return {
      success: true,
      userProfile: {
        _id: addResult._id,
        openid: wxContext.OPENID,
        nickName,
        avatarFileId,
      },
    };
  } catch (error) {
    return {
      success: false,
      errMsg: error.message || error.errMsg || "upsert user profile failed",
    };
  }
};

// 读取用户资料：按 openid 获取当前用户的资料记录。
const getUserProfile = async () => {
  try {
    const wxContext = cloud.getWXContext();

    await ensureCollectionExists(USER_PROFILE_COLLECTION);
    const userProfileResult = await db
      .collection(USER_PROFILE_COLLECTION)
      .where({
        openid: wxContext.OPENID,
      })
      .limit(1)
      .get();

    if (!userProfileResult.data.length) {
      return {
        success: true,
        userProfile: null,
      };
    }

    const userProfile = userProfileResult.data[0];

    return {
      success: true,
      userProfile: {
        _id: userProfile._id,
        openid: userProfile.openid,
        nickName: userProfile.nickName,
        avatarFileId: userProfile.avatarFileId,
      },
    };
  } catch (error) {
    return {
      success: false,
      errMsg: error.message || error.errMsg || "get user profile failed",
    };
  }
};

// 云函数入口函数。
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    case "upsertUserProfile":
      return await upsertUserProfile(event);
    case "getUserProfile":
      return await getUserProfile();
    default:
      return {
        success: false,
        errMsg: "unsupported function type",
      };
  }
};
