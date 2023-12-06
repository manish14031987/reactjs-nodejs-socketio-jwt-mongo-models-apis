"use strict";

const { ChatRoomModel, UserModel, ChatMessageModel } = require("../../models");
const Promise = require("bluebird");
var moment = require("moment");
const { setMessage, setSystemMessage } = require("../../helpers/responseData");
const { time, date } = require("../../helpers/helpers");

async function getChatRoom(filterRequest, query) {
  try {
    var data = [];
    const options = {
      page: query.page || 1,
      limit: 500,
      sort: { _id: -1 },
    };
    const chatList = await ChatRoomModel.paginate(filterRequest, options);
    var language = query.language;
    for (let index = 0; index < chatList.docs.length; index++) {
      var obj = {};
      const item = chatList.docs[index];
      obj.message = setMessage(item.lastMessage, language);
      obj.room = item._id;
      obj.post_id = item.post_id;
      obj.user_id = item.user_id;
      obj.seller_id = item.seller_id;
      obj.buyer = item.buyer;
      obj.seller = item.seller;
      obj.item = {
        image: item.item.image,
        title: item.item.title,
        postID: item.item.postID,
        updateNumber: item.item.updateNumber,
      };
      obj.time = moment(item.lastDate).format("hh:mm A");
      data.push(obj);
    }

    return data;
  } catch (err) {
    throw err;
  }
}
async function getChatDetail(filterRequest) {
  try {
    var data = [];
    const roomData = await ChatMessageModel.find({
      room: filterRequest.room,
      seller_status: { $ne: "CANCELED" },
    });

    await Promise.map(roomData, async (item) => {
      var obj = {};
      obj._id = item._id;
      obj.message = setMessage(item.message, "en");
      obj.systemMessage = setSystemMessage(item.systemMessage, "en");
      obj.message_arabic = setMessage(item.message, "ar");
      obj.systemMessage_arabic = setSystemMessage(item.systemMessage, "ar");
      obj.seller_status = item.seller_status;
      obj.buyer_status = item.buyer_status;
      obj.item = item.item;
      obj.type = item.type;
      obj.isCard = item.isCard;
      obj.offerCancel = item.offerCancel;
      obj.item.paymentType = roomData.paymentType;
      obj.sender = item.sender;
      obj.receiver = item.receiver;
      obj.date = date(item.created_at);
      obj.time = time(item.created_at);
      data.push(obj);
    });

    return data;
  } catch (err) {
    throw err;
  }
}

async function getChatMessage(filterRequest) {
  try {
    var data = [];
    const roomData = await ChatMessageModel.find({
      room: filterRequest.room,
      isCard: false,
      seller_status: { $ne: "CANCELED" },
    });

    await Promise.map(roomData, async (item) => {
      var obj = {};
      obj._id = item._id;
      obj.message = setMessage(item.message, "en");
      obj.date = date(item.created_at);
      obj.time = time(item.created_at);
      data.push(obj);
    });

    return data;
  } catch (err) {
    throw err;
  }
}

async function getChatRoomData(filterRequest) {
  try {
    return await ChatRoomModel.findOne(filterRequest);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getChatRoom,
  getChatDetail,
  getChatMessage,
  getChatRoomData,
};
