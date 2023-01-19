import React, { Component } from "react";
import axios from "axios";
import Loading from "./Loading";

import classnames from "classnames";
import Panel from "./Panel";

import {
  getTotalInterviews,
  getLeastPopularTimeSlot,
  getMostPopularDay,
  getInterviewsPerDay,
} from "helpers/selectors";

import { setInterview } from "helpers/reducers";

const data = [
  {
    id: 1,
    label: "Total Interviews",
    getValue: getTotalInterviews,
  },
  {
    id: 2,
    label: "Least Popular Time Slot",
    getValue: getLeastPopularTimeSlot,
  },
  {
    id: 3,
    label: "Most Popular Day",
    getValue: getMostPopularDay,
  },
  {
    id: 4,
    label: "Interviews Per Day",
    getValue: getInterviewsPerDay,
  },
];

class Dashboard extends Component {
  //create a loading state when app is first being rendered
  //create a focused state which controls if dashboard shows all panels or one
  state = {
    loading: true,
    focused: null,
    days: [],
    appointments: {},
    interviewers: {},
  };

  ///////

  componentDidMount() {
    //on load of dashboard component, check if local storage has value of 'focused' and set state to match
    const focused = JSON.parse(localStorage.getItem("focused"));

    if (focused) {
      this.setState({ focused });
    }

    //fetch data from scheduler-api when dashboard mounts
    Promise.all([
      axios.get("/api/days"),
      axios.get("/api/appointments"),
      axios.get("/api/interviewers"),
    ]).then(([days, appointments, interviewers]) => {
      this.setState({
        loading: false,
        days: days.data,
        appointments: appointments.data,
        interviewers: interviewers.data,
      });
    });

    //create websocket connection when dashboard mounts
    this.socket = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL);

    //listen for messages on socket connection and use them to update state when interview is cancelled/booked on scheduler app
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (typeof data === "object" && data.type === "SET_INTERVIEW") {
        this.setState((previousState) =>
          setInterview(previousState, data.id, data.interview)
        );
      }
    };
  }

  ////////

  //when component updates, if state.focused has changed, update local storage to the new value to persist when page is reloaded
  componentDidUpdate(previousProps, previousState) {
    if (previousState.focused !== this.state.focused) {
      localStorage.setItem("focused", JSON.stringify(this.state.focused));
    }
  }

  ///////

  //close the socket connection when dashboard component unmounts
  componentWillUnmount() {
    this.socket.close();
  }

  //on click of the dashboard or panel, setstate as the opposite of its existing focused value (if null, to the panel id that was clicked. if not null ie already focused, then to null)
  selectPanel(id) {
    this.setState((previousState) => ({
      focused: previousState.focused !== null ? null : id,
    }));
  }

  ////////

  //render() is the only function a component needs to declare - equivalent to the body of components that we declare as functions
  render() {
    const dashboardClasses = classnames("dashboard", {
      "dashboard--focused": this.state.focused,
    });

    if (this.state.loading) {
      return <Loading />;
    }

    //if state is focused, filter for that panels id and render it only, otherwise map and render all panels
    const panels = (
      this.state.focused
        ? data.filter((panel) => this.state.focused === panel.id)
        : data
    ).map((panel) => (
      <Panel
        key={panel.id}
        label={panel.label}
        value={panel.getValue(this.state)}
        onSelect={() => this.selectPanel(panel.id)}
      />
    ));

    return <main className={dashboardClasses}>{panels}</main>;
  }
}

export default Dashboard;
