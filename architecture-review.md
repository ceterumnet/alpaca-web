# Architecture Review

After reviewing a lot of the code base, I've found a bunch of inconsistencies around what lives in the store, the client, and even descrepencies between the various implementations within that contract. I've cleaned up a lot of basic inconsistencies over the last couple of days. However, I'm reaching a point where I need to establish a set of guiding rules and principles.

## General Thoughts I had to start thinking through this:

At the basic layers of the system (UI Components -> Stores -> Clients) we have some blurred lines around what goes where.

I believe the general rule of thumg should be:

A "client" is responsible for making the API calls to the Alpaca Device

A "store" is responsible for interacting with the client and providing reactive properties to "components"

My internal dialog:

- Where does the devicestate optimization occur and how do we define which properties are initially expected?
- We've implemented some optimizations in core actions to not refetch things that are unsupported from the client
- Therefore, I believe that devicestate optimization lives in the store...
- It it in coreActions or are there device specific optimizations?
- Who defines what the list of properties to fetch should be?
- Who defines what the list of can\* and has\* are?
  - Currently, these are defined in property lists in some places and directly on a device interface in others
- Who defines what the list of actions available are?
- Where do we define the list of polled properties vs properties that are fetched on an interval?
- What about sub routines like image capture where there is business logic to poll a specific set of endpoints?
- When should we explicitly define property wrappers vs when should we not?
- What are the common events emitted from the store vs what are simply reactive properties?
- How do we create very consistent casing across properties in the system...it's currently a bit of a mess.

These prompts led me to the following notes and observations:

### Patterns and consistency regarding device state, properties, methods, attributes, devicestate, device lifecyle:

As Part of the cleanup, I'd like to make sure we are using good patterns and being consistent. After reviewing the code, there are a number of instances where things are being done differently.

#### Properties, Methods, Capabilities and State across alpaca device implementations:

Firstly, we have redundant ways of expressing the list of what state "should" exist based on device type:

- `./src/types/device.types.ts`:

  This provides a type specific set of keys that allows us to have type safety by device

- `./src/types/property-mappings.ts`:

  This provides a mapping of lowercase keys with a lookup to the corresponding casing semantics. Definitely handles the weird situations where there isn't a simple way of understanding what gets capitalized where. I "like" aspects of this as it is very focused on a specific concern. However, it feels slightly disjointed from a strongly typed mechanism. It seems that typescript _may_ offer something more robust IMO.

- In `./src/stores/modules/*.ts`:

  Each actions file has varying semantics that are not consistent at all to determine what to fetch based on a specific point in the code. For example, in `telescopeActions.ts` - there is `const readOnlyProperties` in `fetchTelescopeProperties`. In `cameraActions.ts` there is `const propsToFetch` in `startCameraPolling`. Each of these has subtly different semantics. Additionally, `cameraActions.ts` goes on to mix some of the `can*` semantics which doesn't really follow any pattern that we have laid out in `coreActions.ts` in `updateDeviceCapabalities`.

- `updateDeviceCapabilities`

  This has device specific logic that is also not ideal. This gets invoked during `connectDevice` but once again, this is not ideal.

#### Device State consistency

DeviceState is a common alpaca GET call that returns a collection of device states. It is not always implemented in all devices, and it also isn't always a total state of all available data available from a device.

Existing areas of the code which implement Device State optimizations:

- In `coreActions.ts`, `CoreState` provides `deviceStateUnsupported` which is a simple flag as to whether or not `deviceState` appears to be supported by the specific connected device.

- In `coreActions.ts`, `deviceStateAvailableProps` builds on this by giving us a mechanism to determine whether a specific property is available in `deviceState`. We leverage this in various places in the codebase, but I don't think we are consistent.

- In `coreActions`, `lastDeviceStateFetch` provides a time marker which we can use to determine if we need to fetch the deviceState again based on the `cacheTtlMs` passed in the `options` for `fetchDeviceState`. This seems reasonably solid as a foundation.

- In `./src/components/devices/SimplifiedCoverCalibratorPanel.vue` we use `deviceState` as the reactive property that represents the actual device.

- In `./src/components/devices/SimplifiedCameraPanel.vue` we have a `cleanupDeviceState` which deletes values from the store. This seems like part of a general device cleanup activity. Seems like we should consider more of a delete device method in the store that clears all of the state. However, this is specifically done when disconnecting...so I suppose there is a debate to be had around the lifecyle of the device and when / how we should clear which data.

- In `./src/stores/modules/switchActions.ts` we have what looks like a slightly more generic approach in `fetchSwitchDetails` where we look at `this.deviceStateAvailableProps` but then update it based on the result of the `fetchDeviceState`. This may not really be all that logical given the fact that we are doing a little bit of "chicken" or "egg" logic here. At the end of the day, in the device lifecyle we should have a strong notion of what may or may not be available via `deviceState`. This needs to reconsidered once we define the generic lifecyle of a device in terms of "Discovered" -> "Connected" -> ... which is something I think we need to consider.

- In `./src/stores/modules/telescopeActions.ts` we further muddy the waters in `startTelescopePolling` with the concept of `dynamicProperties`

#### Events

- In `./src/stores/modules/eventSystem.ts` we implemented library that was intended to provide event emission and management across the `UnifiedStore`. We aren't using this in very many places. There is a document `docs/events/event-system.md`. However, I really don't like the fact that `addEventListener` is a function name in the standard javascript world. I do like the concepts behind a batching system...we have a decent set of unit tests against this event system. However, is this something we should really have handrolled? Isn't this the kind of thing that is already provided via Vue and/or some common and battle tested library if we genuinely need it?

- In myriad files, we have `handle*` methods. I would really like it if we had a linter rule that could determine if these are actually event handlers vs poorly named methods. `./src/components/panels/CameraControls.vue` seems to be a reasonably clean example of the right way to do this.

#### Connected / Disconnected / Isconnecting / Isdisconnecting / etc...

We definitely have some problems in consistency around handling connections with devices. For example, when you "connect" to a device it has a bit of ambiguity. Given that alpaca is stateless in the sense of network connection by virtue of being RESTful, connected and not connected are actually states we get by making GET calls to the appropriate endpoints. In our system, we have situations where we select a device and click connect. However, in theory, the moment that a user selects a device for a given panel - the connected state should be a reflection of what the alpaca state is.

There is a _lot_ of logic that conflates a local "connected" state in the store with the actual connected state of the alpaca device. This hasn't necessarily created any major problems, but also I suspect we have undesired behaviors that activate upon the local transition from a local not connected state to a local connected state. I suspect that if we define a proper lifecyle, we will be able to uncover these areas...

#### Alpaca Web Device lifecyle

I've alluded to the concept of a lifecyle several times. We need to explicitly define this. For example, if we were to describe the states of this lifecyle:

Main lifecyle:

```
  Discovered
   |
    -> Connected (active in panel)
      |
       -> Connected (alpaca) -> Polling
                                       |
                         Disconnected <

          etc...
```

And then subroutines:

```

          |
           > [capturing an image, slewing to a target, etc...]

```

We have developed the concept of using components such as `CameraExposureControl.vue` to provide the logic and polling to provide Alpaca Web specific workflows where it is not explicity an Alpaca specified. For example, you don't have to do anything after invoking `startexposure` via `PUT`. You _can_ choose to download the image. But for it to make sense to the user, you must poll `GET` `imageready` and you can also choose to poll `GET` `percentcompleted` in order to get a value from the Alpaca device. Another example is if you enable cooling on a camera. The user expects some feedback around whether or not the camera is at its target temperature which may include polling various datums such as `coolerpower`, `ccdtemperature`, `cooleron`. And if we detected that the `cooleron` was suddenly changed without it coming from an AlpacaWeb action - we might tell the user that the camera has unexpectedly disabled the cooler. The point of this paragraph is to capture the nuance of various lifecyles that interrelate but are not explicitly defined by the alpaca standard.

There is another case to consider which is where the alpaca / ASCOM standard have specified that certain things are conditional. An example of this is described in [Values vs Index Mode](VALUES_VS_INDEX_ALPACA_IMPLEMENTATION_DETAILS.md).

#### What belongs in a store vs client

It is not entirely clear to me what should go in a client vs a store always. I think this is an area we missed strongly defining early on. For example, when we look at the casing conventions of methods, properties, etc...there is a lot of murkiness.

To be fair, in most cases it should be pretty straight forward. There is typically a one to one mapping for most concepts in these defices. A camera is a camera. Starting an exposure is starting an exposure. But what if the driver expects a certain sequence of things to be true like we described in the Values vs Index mode.

One could argue this should be encapsulated in a client so that the store could potentially work with other clients such as an INDI based connection. I definitely like this idea, but I'm not sure how well it works in practice. For example, the image handling semantics of Alpaca are quite nuanced. Should that be isolated to a client contract? Perhaps. However, I would want to be careful of inventing yet another "standard" which further abstracts things making reasoning about the system more difficult. The values vs index mode is a perfect example of where we can just start the push the peas around the plate a bit.

However, I do think how we express the UI should be independent. I'd be interested in exploring what patterns might work well to achieve this goal long term, and ensure we aren't building ourselves into a corner architecturally.

#### General Observations on these patterns and consistency

There have been many point in time optimizations that partially implement good ideas, and in some cases not very good ideas. The system works reasonably well at the moment, but the architecture is not very clearly expressed in the code. My goal is to have a very clear separation of concerns and strong type safety.
