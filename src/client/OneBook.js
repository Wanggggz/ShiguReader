import React, { Component } from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
const nameParser = require('../name-parser');
import { Link } from 'react-router-dom';
import stringHash from "string-hash";
import Sender from './Sender';
import './style/OneBook.scss';
import ErrorPage from './ErrorPage';
import CenterSpinner from './subcomponent/CenterSpinner';
const spop  = require("./subcomponent/spop");
import FileChangeToolbar from './subcomponent/FileChangeToolbar';
var classNames = require('classnames');
var dateFormat = require('dateformat');
import LoadingImage from './LoadingImage';
const util = require("../util");
import AudioPlayer from 'react-modular-audio-player';
import screenfull from 'screenfull';


function getUrl(fn){
  return "../" + fn;
}

export default class OneBook extends Component {
  constructor(props) {
    super(props);
    this.state = {
      files: [],
      musicFiles: [],
      index: -1
    };

    this.failTimes = 0;
  }

  getHash(){
    return this.props.match.params.number;
  }
  
  componentDidMount() {
    const file = this.getHash();
    if(file && this.loadedHash !== file && this.failTimes < 3){
      this.displayFile(file);
    }
  }
  
  componentDidUpdate() {
    this.componentDidMount();
  }
  
  displayFile(file){
    Sender.post("/api/extract", {  hash: this.getHash() }, res => {
      this.res = res;
      if (!res.failed) {
        this.loadedHash = this.getHash();
        let files = res.files || [];
        files.sort((a, b) => a.localeCompare(b));

        let musicFiles = res.musicFiles || [];
        musicFiles.sort((a, b) => a.localeCompare(b));

        this.setState({ files, musicFiles, index: 0, path:res.path, fileStat: res.stat });
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
      }else{
        this.failTimes++;
        this.forceUpdate();
      }
    });
  }
  
  componentWillUnmount() {
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
  }
  
  handleKeyDown(event) {
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      this.changePage(this.state.index + 1);
    } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      this.changePage(this.state.index - 1);
    }
  }
  
  changePage(index) {
    const lastIndex = (this.state.files || []).length - 1;
    if (index < 0) {
      return;
    } else if (index > lastIndex) {
      spop({
        template: 'Last Page',
        position: 'top-right',
        autoclose: 3000
      });
      return;
    }
    this.setState({ index });
  }
  
  next(event) {
    let index = parseInt(event.target.getAttribute("index")) + 1;
    event.preventDefault();
    this.changePage(index);
  }
  
  prev(event) {
    let index = parseInt(event.target.getAttribute("index")) - 1;
    event.preventDefault();
    this.changePage(index);
  }
  
  isFailedLoading(){
    return this.res && this.res.failed;
  }

  renderPagination() {
    if(_.isPad()){ return; }
    const { files, index } = this.state;
    const isLast = index+1 === files.length;
    const text = (index+1) + "/" + files.length;
    const cn = classNames("one-book-foot-index-number", {
      "is-last": isLast
    })
    return <div className={cn}>{text}</div>;
  }

  renderFileSizeAndTime(){
    if (this.state.fileStat) {
      const size = Math.ceil(this.state.fileStat.size/ 1000000.0) + "MB";
      const mTime = dateFormat(this.state.fileStat.mtime, "isoDate");
      const { files, index } = this.state;
      const title = util.getFn(files[index], "/" );
      const text = [mTime, size, title].join(" :: ");
      return <div className={"file-stat"}>{text} </div>
    }
  }

  renderImage(){
    const { files, index } = this.state;
    if(!_.isPad()){
      const cn = classNames("one-book-image", {
        "has-music": this.hasMusic()
      });
      return <img  className={cn} src={getUrl(files[index])} alt="book-image"
                   onClick={this.next.bind(this)}
                   onContextMenu={this.prev.bind(this)}
                   index={index}
                   />
    } else {
      const images = files.map(file => {
        return <LoadingImage className={"mobile-one-book-image"} 
                             bottomOffet={-4000}
                             topOffet={-3000}
                             url={getUrl(file)} 
                             key={file}/>
      });

      return (<div className="mobile-one-book-container">
                {images}
            </div>);
    }
  }

  renderPath() {
    if (!this.state.path) {
      return;
    }

    const parentPath = _.getDir(this.state.path);
    const parentHash = stringHash(parentPath);
    const toUrl = ('/explorer/'+ parentHash);
    const toolbar = !_.isPad() && <FileChangeToolbar className="one-book-toolbar" file={this.state.path}/>;

    return (
      <div className="one-book-path">
        <Link to={toUrl}>{parentPath} </Link>
        {toolbar}
      </div>);
  }

  hasMusic(){
    const {musicFiles} = this.state;
    return musicFiles.length > 0;
  }

  renderMusicPlayer(){
    if(this.hasMusic()){
      const {musicFiles} = this.state;
      let playlist = musicFiles.map(e => {
        return { src: getUrl(e), title: util.getFn(e, "/") }
      })
      return <AudioPlayer  audioFiles={playlist}
                           hideLoop={true}
                           playerWidth={"90%"}
                           iconSize={"1.5rem"}
                           fontWeight={"500"}
                           fontSize={"1.2rem"}/>;
    }
  }

  toggleFullScreen(){
    screenfull.toggle();
    this.forceUpdate();
  }

  renderToggleFullScreenButton(){
    return <button className="fas fa-arrows-alt fs-toggle-button" title="Toggle Full Screen" onClick={this.toggleFullScreen.bind(this)}/>
  }

  render() {
    if (this.isFailedLoading()) { 
      return <ErrorPage res={this.res.res}/>;
    }
    
    const { files, index } = this.state;
    if (_.isEmpty(files)) {
      if(this.res && !this.refs.failed){
        return <h3><center>no content files</center></h3>;
      } else {
        return (<CenterSpinner />);
      } 
    }
    
    const result = nameParser.parse(_.getFn(this.state.path));
    const author = result && result.author;
    let tags = (result && result.tags)||[];
    //temp
    tags = author? tags.concat(author): tags;
    
    const tagDivs = tags.length > 0 && tags.map((tag)=>{
      const tagHash = stringHash(tag);
      const url = tag === author? ("/author/" + tagHash) : ("/tag/" + tagHash);
      return (<div key={tag} className="one-book-foot-author" >
                <Link to={url}  key={tag}>{tag}</Link>
              </div>);
    })
  
    if(this.state.path){
      document.title = _.getFn(this.state.path);
    }

    return (  
      <div className="one-book-container">
        <div className="one-book-wrapper">
          <div className="one-book-title"><center>{_.getFn(this.state.path)} {this.renderToggleFullScreenButton()} </center></div>
          {this.renderImage()}
          {this.renderMusicPlayer()}
        </div>
        {this.renderPagination()}
        <div className="one-book-footer">
          {tagDivs}
        </div>
        {this.renderPath()}
        {this.renderFileSizeAndTime()}
      </div>
    );
  }
}

OneBook.propTypes = {
};
