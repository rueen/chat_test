/*
 * @Author: diaochan
 * @Date: 2024-04-01 14:35:35
 * @LastEditors: diaochan
 * @LastEditTime: 2024-04-02 09:30:47
 * @Description: 
 */
import Taro from '@tarojs/taro';
import { PureComponent } from 'react'
import { View, Text, Icon, Input } from '@tarojs/components'
import './index.less'

class Chat extends PureComponent {
  state = {
    list: [{
      type: 'robot',
      content: '你好！有什么可以帮助你的吗？'
    }],
    question: '',
    topK: 1, // 1~10
    topKThreshold: 0.5 // 浮点型 0.5 ~ 1
  }

  componentWillUnmount(){
    // Object.values(this.task).forEach(item => {
    //   item.close()
    // })
    Taro.closeSocket()
  }

  task = {};
  
  async onLoad(){
    
  }

  scrollToBottom = () => {
    const query = Taro.createSelectorQuery().in(this);
    query.select('.container').boundingClientRect(data => {
      if (data) {
        // 滚动到底部
        Taro.pageScrollTo({
          scrollTop: data.bottom,
          duration: 100 // 如果需要平滑滚动，可以设置duration时间
        });
      }
    }).exec();
  }

  connectSocket = (question, id) => {
    const { topK, topKThreshold } = this.state;
    Taro.connectSocket({
      url: 'wss://aigc-test.unidt.com/dolly-knowledge/ws/rag-chat',
      header: {
        "Authorization":'Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxMDg1MjY5MDYxMzA4MjUyMTYwIiwiZGV0YWlsIjoie1wiaWRcIjoxMDg1MjY5MDYxMzA4MjUyMTYwLFwidXNlck5hbWVcIjpcIkxpdUppYW5nXCIsXCJhdXRoZW50aWNOYW1lXCI6XCJqaWFuZ1wiLFwicGhvbmVOdW1iZXJcIjpcIjEzMjIzNDU0NTY3XCIsXCJwYXNzd29yZFwiOlwiJDJhJDEwJGJhYTBCaGhELzA4RVRVNmJsdjlqSC5uOGx6b0o1dzJWWjh0azYvN3hJRDJ1WmNicTBGcFBtXCIsXCJlbWFpbFwiOlwiXCIsXCJhY2NvdW50SWRcIjoxMDg1MjY5MDYwMzQ3NzU2NTQ0LFwiYWNjb3VudE5hbWVcIjpcIkxpdUppYW5nXCIsXCJjcmVhdGVUaW1lXCI6XCIyMDIzLTAzLTE0IDE4OjIzOjI4XCIsXCJ1cGRhdGVUaW1lXCI6XCIyMDI0LTAzLTIwIDE2OjU3OjIyXCIsXCJpc0RlbGV0ZWRcIjowLFwicm9sZVwiOjAsXCJleHBpcmF0aW9uXCI6XCIyMDI0LTA0LTI4IDE2OjAwOjQwXCJ9IiwibG9naW5NZXRob2QiOiJ0ZW5hbnQiLCJpYXQiOjE3MTE2OTkyNDAsImV4cCI6MTcxNDI5MTI0MH0.m3QC1W-wnTf6zCpjGgjUKz8umK0fqkhTqrxyXl3QV3gGvAe628t0ybt4ImzOL_iwzPiFIyGNJOy-awzTJuUhlg',
      },
      method: 'POST',
      success: function () {
        console.log('connect success')
      }
    })
    .then(task => {
      console.log(task, '-task')
      this.task[`id_${id}`] = task;
      task.onOpen(() => {
        task.send({
          data: JSON.stringify({
            collectionIds: [1222928485013331968],
            model: "BaiChuan",
            question: question,
            topK,
            topKThreshold
          })
        })
      })
      task.onMessage((resp) => {
        const data = JSON.parse(resp.data);
        const _list = [...this.state.list];
        const currentItem = _list.find(item => item.id === id);
        currentItem.loading = false;
        if(data.code === 200){
          if(data.status){
            task.close();
            currentItem.canStop = false;
            this.setState({
              list: _list
            })
          } else {
            const {response} = data;
            currentItem.content = response;
            this.setState({
              list: _list
            })
            // this.scrollToBottom();
          }
        }
      })
      task.onError(function () {
        console.log('onError')
      })
      task.onClose(function (e) {
        console.log('onClose: ', e)
      })
    })
  }

  handleStop = (item) => {
    const id = item.id;
    this.task[`id_${id}`].close();
    const _list = [...this.state.list];
    const currentItem = _list.find(i => i.id === id);
    currentItem.canStop = false;
    currentItem.loading = false;
    this.setState({
      list: _list
    })
  }

  handleCopy = (item) => {
    Taro.setClipboardData({
      data: item.content,
      success: function () {
        Taro.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 2000
        })
      }
    })
  }

  onSubmit = () => {
    const { question, topK, topKThreshold } = this.state;
    const _list = [...this.state.list];
    const id = new Date().getTime();

    if(!question.trim()){
      Taro.showToast({
        title: '请输入您的问题',
        icon: 'none',
        duration: 2000
      })
      return null;
    }
    if(!/^([1-9]|10)$/.test(topK)){
      Taro.showToast({
        title: '整型输入有误，请输入1~10的整数',
        icon: 'none',
        duration: 2000
      })
      return null;
    }
    if(!/^(0\.[5-9]\d*|0\.0*[5-9]|[1-9]\d*|1(\.0*)?)$/.test(topKThreshold)){
      Taro.showToast({
        title: '浮点型输入有误，请输入>=0.5且<=1的数字',
        icon: 'none',
        duration: 2000
      })
      return null;
    }
    _list.push({
      type: 'me',
      content: question
    })
    _list.push({
      type: 'robot',
      content: '',
      id,
      loading: true,
      canStop: true
    })
    this.connectSocket(question, id)
    this.setState({
      list: _list,
      question: '',
    })
  }

  _renderLoading = () => {
    return (
      <View className='loading-container'>
        <View className='loading-dot'></View>
        <View className='loading-dot'></View>
        <View className='loading-dot'></View>
      </View>
    )
  }

  _renderRobot = (item, index) => {
    return (
      <View className='robot'>
        <View className='avatar'>
          <Icon size='24' className='iconfont icon-robot-fill' />
        </View>
        <View>
          <View className='content'>
            <View className='flex'>
              <Text>{item.content}</Text>
            </View>
            {item.loading ? (
              this._renderLoading()
            ) : null}
            {(index != 0 && !item.canStop && !!item.content) ? (
              <View className='copy-btn' onClick={this.handleCopy.bind(this, item)}>
                <Icon size='12' color='#4f5053' className='iconfont icon-copy' />
                <Text className='copy-text'>复制</Text>
              </View>
            ) : null}
          </View>
          {item.canStop ? (
            <View className='stop-btn' onClick={() => {this.handleStop(item)}}>停止输出</View>
          ) : null}
        </View>
      </View>
    )
  }

  _renderMe = (item) => {
    return (
      <View className='me'>
        <View className='content flex'>
          <Text>{item.content}</Text>
        </View>
        <View className='avatar'>
          <Icon size='20' className='iconfont icon-yonghu' />
        </View>
      </View>
    )
  }

  render() {
    const {list, question, topK, topKThreshold} = this.state;
    return (
      <>
        <View className='container'>
          {list.map((item, index) => (
            <View className='messate-item' key={index}>
              {item.type === 'robot' ? this._renderRobot(item, index) : null}
              {item.type === 'me' ? this._renderMe(item) : null}
            </View>
          ))}
        </View>
        <View className='bottom'>
          <View className='btn-wrap' >
            <Input
              type='text'
              placeholder='请输入'
              value={question}
              className='input'
              onInput={(e) => {this.setState({question: e.detail.value})}}
              onConfirm={this.onSubmit}
            />
            <View className='flex'>
              <View className='number-input-wrap'>
                <Text className='number-input-tips'>整型</Text>
                <Input
                  type='number'
                  placeholder='整型'
                  value={topK}
                  className='number-input'
                  onInput={(e) => {this.setState({topK: e.detail.value - 0})}}
                />
              </View>
              <View className='number-input-wrap'>
                <Text className='number-input-tips'>浮点型</Text>
                <Input
                  type='digit'
                  placeholder='浮点型'
                  value={topKThreshold}
                  className='number-input'
                  onInput={(e) => {this.setState({topKThreshold: e.detail.value - 0})}}
                />
              </View>
              <Icon size='24' color='#c6c6c6' className='iconfont icon-fasong send-btn' onClick={this.onSubmit} />
            </View>
          </View>
        </View>
      </>
    )
  }
}
export default Chat;
