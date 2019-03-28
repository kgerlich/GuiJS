g = new GuiJS({
	anchor: 'anchor',
  vars: {
    hello: 'helloworld',
    getter: function() {
      return 'test' + Math.floor((Math.random() * 100) + 1);
    },
    color: 'red'
  },
  //hooks: ['[[', ']]']
});
