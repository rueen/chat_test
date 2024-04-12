/*
 * @Author: diaochan
 * @Date: 2024-04-01 14:35:35
 * @LastEditors: diaochan
 * @LastEditTime: 2024-04-11 16:09:18
 * @Description: 
 */
import Taro from '@tarojs/taro';
import { PureComponent } from 'react'
import { View, Text, Icon, Input, Textarea } from '@tarojs/components'
import classnames from 'classnames';
import './index.less'

class Chat extends PureComponent {
  state = {
    list: [{
      type: 'robot',
      content: '你好！有什么可以帮助你的吗？'
    }],
    question: '',
    topK: 3, // 1~10
    topKThreshold: 0.75, // 浮点型 0.5 ~ 1
    collectionIds: ['1222928485013331968'],
    prompt: '',
    model: "BaiChuan",
    isCompleted: true, // 是否已回复完成
  }

  lastQuestion = null // 保存最后一次提问，连接断开时及时补上

  componentWillUnmount(){
    this.task.close();
    if(this.timer){
      clearInterval(this.timer);
    }
  }

  timer = null;
  
  async onLoad(){
    this.connectSocket();
  }

  sendMessage = (question) => {
    const { topK, topKThreshold, collectionIds, prompt, model } = this.state;
    if(this.timer){
      clearInterval(this.timer);
    }
    const params = {
      collectionIds: collectionIds.join(','),
      prompt,
      model,
      question: question,
      topK,
      topKThreshold
    }
    this.lastQuestion = question;
    console.log(params)
    this.task.send({
      data: JSON.stringify(params)
    })
  }
  
  startHeartBeat = () => {
    this.timer = setInterval(() => {
      console.log('发送心跳消息');
      this.task.send('ping')
    }, 30000)
  }

  connectSocket = () => {
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
      this.task = task;
      this.task.onOpen(() => {
        console.log('WebSocket连接已打开！')
        if(!!this.lastQuestion){
          this.sendMessage(this.lastQuestion)
          this.lastQuestion = null;
        } else {
          // 开始心跳
          this.startHeartBeat()
        }
      })
      this.task.onMessage((resp) => {
        this.lastQuestion = null;
        // console.log(resp);
        const data = JSON.parse(resp.data);
        const _list = [...this.state.list];
        const currentItem = _list[_list.length - 1];
        // console.log(data);
        this.setState({
          loading: false
        })
        if(data.code === 200){
          if(data.status){
            this.setState({
              list: _list,
              isCompleted: true
            })
            this.startHeartBeat();
          } else {
            const {response} = data;
            currentItem.content = response;
            this.setState({
              list: _list,
              isCompleted: false
            })
          }
        } else {
          currentItem.content = data.error_message;
          currentItem.isError = true;
          this.setState({
            list: _list,
            isCompleted: true
          })
        }
      })
      this.task.onError(() => {
        console.log('onError')
        if(this.timer){
          clearInterval(this.timer);
        }
      })
      this.task.onClose((e) => {
        console.log('onClose: ', e)
        if(this.timer){
          clearInterval(this.timer);
          this.connectSocket();
        }
      })
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
    const { question, topK, topKThreshold, isCompleted } = this.state;
    const _list = [...this.state.list];

    if(!isCompleted){
      Taro.showToast({
        title: '请等待当前对话完成…',
        icon: 'none',
        duration: 2000
      })
      return null;
    }
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
    })
    this.sendMessage(question)
    this.setState({
      list: _list,
      question: '',
      loading: true,
      isCompleted: false
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
    const {loading, list} = this.state;
    return (
      <View className='robot'>
        <View className='avatar'>
          <Icon size='24' className='iconfont icon-robot-fill' />
        </View>
        <View>
          <View className={classnames({
            'content': true,
            'error': item.isError
          })}
          >
            <View className='flex'>
              <Text>{item.content}</Text>
            </View>
            {(loading && index === list.length - 1) ? (
              this._renderLoading()
            ) : null}
            {(index != 0 && !!item.content) ? (
              <View className='copy-btn' onClick={this.handleCopy.bind(this, item)}>
                <Icon size='12' color='#4f5053' className='iconfont icon-copy' />
                <Text className='copy-text'>复制</Text>
              </View>
            ) : null}
          </View>
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

  _renderCollectionIds = () => {
    const {collectionIds, model} = this.state;
    return (
      <View className='collectionIds'>
        {collectionIds.map((item, index) => (
          <Input
            key={index}
            type='text'
            placeholder='请输入'
            value={item}
            className='input'
            onInput={(e) => {
              const _collectionIds = [...this.state.collectionIds];
              _collectionIds[index] = e.detail.value;
              this.setState({
                collectionIds: _collectionIds
              })
            }}
            onConfirm={this.onSubmit}
          />
        ))}
        <Input
          type='text'
          placeholder='请输入model'
          value={model}
          className='input input-model'
          onInput={(e) => {
            this.setState({
              model: e.detail.value
            })
          }}
          onConfirm={this.onSubmit}
        />
      </View>
    )
  }

  _renderPrompt = () => {
    const {prompt} = this.state;
    return (
      <View className='prompt'>
        <Textarea
          placeholder='请输入prompt'
          value={prompt}
          className='input'
          maxlength={-1}
          onInput={(e) => {
            this.setState({
              prompt: e.detail.value
            })
          }}
        />
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
          <View className='extraData'>
            {this._renderCollectionIds()}
            {this._renderPrompt()}
          </View>
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
