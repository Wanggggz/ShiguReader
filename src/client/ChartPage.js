import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './style/ChartPage.scss';
import Sender from './Sender';
import _ from "underscore";
const nameParser = require('../name-parser');
const filesizeUitl = require('filesize');
import CenterSpinner from './subcomponent/CenterSpinner';
import ErrorPage from './ErrorPage';
import {Bar, Pie, Line} from 'react-chartjs-2';
const clientUtil = require("./clientUtil");
const {  getBaseName } = clientUtil;
const util = require("../util");
const {isCompress, array_unique} = util;
import RadioButtonGroup from './subcomponent/RadioButtonGroup';
import { isVideo } from '../util';
import Accordion from './subcomponent/Accordion';

function parse(str){
    return nameParser.parse(getBaseName(str));
}

function renderTable(labels, values){
    const tableHeader = (<thead><tr>
        <th scope="col">name</th>
        <th scope="col">number</th>
        </tr></thead>);

        const rows = labels.map((e, index) => {
            return (<tr key={index}><th scope="row">{e}</th><td>{values[index]}</td></tr>);
        });

    return (
        <table className="table aji-table">
            {tableHeader}
            <tbody>
                {rows}
            </tbody>
        </table>
    );
}

export default class ChartPage extends Component {
    constructor(prop) {
        super(prop);
        this.failedTimes = 0;
        this.state = {fileType: "compressed"};
    }

    componentDidMount() {
        if(this.failedTimes < 3) {
            Sender.post("/api/allInfo", {}, res => {
                this.handleRes(res);
            });

            Sender.get('/api/getGoodAuthorNames', res =>{
                this.setState({
                    goodAuthors: res.goodAuthors,
                    otherAuthors: res.otherAuthors
                })
            });
        }
    }

    handleRes(res){
        if (!res.failed) {
            let { fileToInfo } = res;
            this.fileToInfo = fileToInfo || {};
            this.files = _.keys(this.fileToInfo) || [];
        }else{
            this.failedTimes++;
        }
        this.res = res;
        this.forceUpdate();
    }

    isFailedLoading(){
        return this.res && this.res.failed;
    }

    getHash() {
        return this.props.match.params.number;
    }

    getPathFromLocalStorage(){
        const hash = this.getHash();
        return clientUtil.getPathFromLocalStorage(hash) || "";
    }

    getFilterFiles(){
        const func =  this.isShowingVideoChart()? isVideo : isCompress;
        const fp = this.getPathFromLocalStorage();
        const result = (this.files || []).filter(e => {
            if(fp && !e.startsWith(fp)){
                return false;
            }
            return func(e);
        });
        return result;
    }

    isShowingVideoChart(){
        return this.state.fileType === "video";
    }

    renderComiketChart(){
        if(this.isShowingVideoChart()){
            return;
        }

        const byComiket = {}; //c91 -> 350
        const tagByComiket = {}; // c95 -> kankore -> 201
        this.getFilterFiles().forEach(e => {
            const result = parse(e);
            if(result && result.comiket){
                let cc = result.comiket;
                byComiket[cc] = byComiket[cc] || 0;
                byComiket[cc]++;

                tagByComiket[cc] = tagByComiket[cc] || {};
                result.tags.forEach(tag => {
                    if(tag !== cc && tag !== "同人誌"){
                        tagByComiket[cc][tag] = tagByComiket[cc][tag] || 0;
                        tagByComiket[cc][tag]++;
                    }
                })
            }
        })

        let labels = nameParser.ALL_COMIC_TAGS.slice();
        let values = [];
        labels.forEach((e, index )=> {
            const vv = byComiket[e]; 
            values.push(vv);

            if(!vv){
                labels[index] = undefined;
            }
        });

        labels = labels.filter(e => !!e);
        values = values.filter(e => !!e);

        const data = {};
        data.labels = labels;
        data.datasets = [{
            type: 'bar',
            label: 'by comiket',
            backgroundColor: "#15c69a",
            data:  values
          }]

        const opt = {
            maintainAspectRatio: false,
            legend: {
                position: "right"
            }
        };

        //add big tag
        return (
            <div className="individual-chart-container">
                <div>
                <Bar
                    data={data}
                    width={800}
                    height={200}
                    options={opt}
                />
                </div>
                <Accordion header="toggle chart"  body={renderTable(labels, values)} />
            </div>
          );
    }

    rendeTimeChart(){
        const byTime = {}; //time -> 300. 
        this.getFilterFiles().forEach(e => {
            const fileInfo = this.fileToInfo[e];
            const pA = parse(e);
            let aboutTimeA = pA && nameParser.getDateFromTags(pA.tags);
            aboutTimeA = aboutTimeA && aboutTimeA.getTime();
            aboutTimeA = aboutTimeA || fileInfo.mtime;

            const t  = new Date(aboutTimeA);
            const tLabel = t.getFullYear();
            byTime[tLabel] = byTime[tLabel] || 0;
            byTime[tLabel]++;
        });

        const data = {};
        data.labels = _.keys(byTime);
        const value = _.values(byTime);

        data.datasets = [{
            type: 'line',
            label: 'by year',
            backgroundColor: "orange",
            fill: false,
            showLine: true,
            tension: 0,
            data:  value
          }];

          return (
            <div className="individual-chart-container">
              <Line
                className="type-time-chart"
                data={data}
                width={800}
                height={200}
                options={{
                    maintainAspectRatio: false,
                    legend: {
                        position: "right"
                    }
                }}
              />
            </div>
          );
    }

    renderPieChart(){
        if(this.isShowingVideoChart()){
            return;
        }

        const byType = {}; //doujin -> 300. 
        this.getFilterFiles().forEach(e => {
            const result = parse(e);
            if(result &&  result.type){
                const type = result.type;
                byType[type] = byType[type] || 0;
                byType[type]++;
            }
        });

        const data = {};
        data.labels = _.keys(byType);
        const value = _.values(byType);

        data.datasets = [{
            type: 'pie',
            label: 'by type',
            backgroundColor: ["aqua", "blue", "orange", "yellow","green", "lime", "pink"],
            data:  value
          }];

          return (
            <div className="individual-chart-container">
              <Pie
                className="type-pie-chart"
                data={data}
                width={300}
                height={300}
                options={{
                    maintainAspectRatio: false,
                    legend: {
                        position: "right"
                    }
                }}
              />
            </div>
          );

    }

    renderTotalSize(){
        let total = 0;
        const files = this.getFilterFiles();
        const num = files.length;
        files.forEach(e => {
           total += this.fileToInfo[e].size;
        })
        return (<div className="total-info"> 
                     <div>{`There are ${num} ${this.state.fileType} files`}</div>
                     <div>{`Total: ${filesizeUitl(total, {base: 2})}`}</div>
                </div>)
    }

    renderGoodBadDistribution(){
        if(this.isShowingVideoChart()){
            return;
        }

        const {goodAuthors, otherAuthors} = this.state;
        const data = {
            labels : []
        };
        const segment = 0.05;

        for(let ii = 0; ii < 1/segment; ii++){
            data.labels.push((ii * segment));
        }

        if(goodAuthors && otherAuthors){
            let allAuthors = _.keys(goodAuthors).concat(_.keys(otherAuthors));
            allAuthors = array_unique(allAuthors);
            let value = [];

            allAuthors.forEach(aa => {
                const good = goodAuthors[aa] || 0;
                const other = otherAuthors[aa] || 0;
                let pp = good/(good+other);
                pp = pp.toFixed(2);

                for(let ii = 0; ii < data.labels.length; ii++){
                    const segmentBeg = data.labels[ii];
                    const segmentEnd = segmentBeg + segment;

                    if(segmentBeg <= pp && pp < segmentEnd ){
                        value[ii] = value[ii] || 0;
                        value[ii]++;
                        break;
                    }
                }
            });

            data.labels = data.labels.slice(1);
            value = value.slice(1);
            // console.log(value);

            const opt = {
                maintainAspectRatio: false,
                legend: {
                    position: "right"
                }
            };

            data.datasets = [{
                type: 'line',
                label: 'good/(good+other) distribution',
                backgroundColor: "#15c69a",
                data:  value,
                fill: false,
              }]

            return (
                <div className="individual-chart-container">
                  <Line
                    data={data}
                    width={800}
                    height={200}
                    options={opt}
                  />
                </div>
              );
        }
    }
    
    onFileTypeChange(e){
        this.setState({
            fileType: e
        });
    }

    render(){
        document.title = "Chart"
        const too_few = 30;

        const FILE_OPTIONS = [
          "video",
          "compressed"
        ];

        const files = this.getFilterFiles();
        const {fileType} = this.state;

        const filePath = <div>{this.getPathFromLocalStorage() }</div>; 

        const radioGroup = <RadioButtonGroup 
                            className="chart-radio-button-group"
                            checked={FILE_OPTIONS.indexOf(this.state.fileType)} 
                            options={FILE_OPTIONS} 
                            onChange={this.onFileTypeChange.bind(this)}/>

        if (!this.res) {
            return (<CenterSpinner/>);
        } else if(this.isFailedLoading()) {
            return <ErrorPage res={this.res.res}/>;
        } else if(files.length < too_few){
            return ( <div className="chart-container container">
                        {filePath}
                        {radioGroup}
                        <div className="alert alert-info" role="alert" > 
                             <div>{`There are only ${files.length} ${fileType} files.`} </div> 
                             <div>Unable to render chart</div>
                        </div>
                    </div>);
        }else{ 
            return (
                <div className="chart-container container">
                    {filePath}
                    {radioGroup}
                    {this.renderTotalSize()}
                    {this.rendeTimeChart()}
                    {this.renderComiketChart()}
                    {this.renderPieChart()}
                    {this.renderGoodBadDistribution()}
                </div>)
        }
    }
}

ChartPage.propTypes = {
    res: PropTypes.object
};
