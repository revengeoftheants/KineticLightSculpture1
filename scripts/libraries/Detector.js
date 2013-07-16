// TODO: This should be replaced with the checking code from http://get.webgl.org
// they have better supprot messages for different browsers
var Detector={
	canvas:!!window.CanvasRenderingContext2D,
	webgl:(function(){
		try{
			return!!window.WebGLRenderingContext&&!!document.createElement('canvas').getContext('experimental-webgl');
		}
		catch(e){
			return false;
		}
	})(),
	chrome:(function() {
		return navigator.userAgent.toLowerCase().indexOf("chrome") > -1;
	})(),
	workers:!!window.Worker,
	fileapi:window.File&&window.FileReader&&window.FileList&&window.Blob,
	getWebGLErrorMessage:function(){
		var element=document.createElement('div');
		element.id='webgl-error-message';
		element.style.fontFamily='monospace';element.style.fontSize='13px';
		element.style.fontWeight='normal';
		element.style.textAlign='center';
		element.style.background='#fff';
		element.style.color='#000';
		element.style.padding='1.5em';
		element.style.width='400px';
		element.style.margin='5em auto 0';
		if(!this.webgl){
			element.innerHTML=window.WebGLRenderingContext?['Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br />','Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'].join('\n'):['Your browser does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">WebGL</a>.<br/>','Find out how to get it <a href="http://get.webgl.org/" style="color:#000">here</a>.'].join('\n');
		}
	return element;
	},
	addGetWebGLMessage:function(parameters){
		var parent,id,element;
		parameters=parameters||{};
		parent=parameters.parent!==undefined?parameters.parent:document.body;
		id=parameters.id!==undefined?parameters.id:'unsupported';
		element=Detector.getWebGLErrorMessage();
		element.id=id;
		document.body.insertBefore(element, document.body.childNodes[0]);
	},
	getChromeErrorMessage:function(){
		var element=document.createElement('div');
		element.id='chrome-error-message';
		element.style.fontFamily='monospace';element.style.fontSize='13px';
		element.style.fontWeight='normal';
		element.style.textAlign='center';
		element.style.background='#fff';
		element.style.color='#000';
		element.style.padding='1.5em';
		element.style.width='400px';
		element.style.margin='5em auto 0';
		if(!this.chrome){
			element.innerHTML='This application is resource-intensive. For the best performance, please use Google\'s <a href="https://www.google.com/intl/en/chrome/browser/" style="color:#000">Chrome browser</a>.';
		}
	return element;		
	},
	addGetChromeMessage:function(parameters){
		var parent,id,element;
		parameters=parameters||{};
		parent=parameters.parent!==undefined?parameters.parent:document.body;
		id=parameters.id!==undefined?parameters.id:'unsupported';
		element=Detector.getChromeErrorMessage();
		element.id=id;
		document.body.insertBefore(element, document.body.childNodes[0]);	
	}
};