{
  "type": "FRAME",
  "name": "Left Nav",
  "layout": {
    "mode": "VERTICAL",
    "padding": {
      "top": 32,
      "right": 16,
      "bottom": 32,
      "left": 16
    },
    "itemSpacing": 16,
    "sizing": {
      "primary": "FIXED",
      "counter": "FIXED"
    }
  },
  "width": 160,
  "height": 800,
  "visual": {
    "fills": [
      {
        "type": "SOLID",
        "color": {
          "r": 0.9019607901573181,
          "g": 0.9019607901573181,
          "b": 0.9019607901573181
        }
      }
    ],
    "strokeWeight": 1,
    "strokeAlign": "INSIDE",
    "opacity": 0.949999988079071
  },
  "children": [
    {
      "type": "FRAME",
      "name": "Top Items",
      "layout": {
        "mode": "VERTICAL",
        "padding": {
          "top": 0,
          "right": 0,
          "bottom": 0,
          "left": 0
        },
        "itemSpacing": 16,
        "sizing": {
          "primary": "AUTO",
          "counter": "FIXED"
        },
        "align": "STRETCH"
      },
      "width": 128,
      "height": 321,
      "visual": {
        "strokeWeight": 1,
        "strokeAlign": "INSIDE"
      },
      "children": [
        {
          "type": "FRAME",
          "name": "General_Settings_Active",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 12,
              "right": 8,
              "bottom": 12,
              "left": 8
            },
            "itemSpacing": 8,
            "sizing": {
              "primary": "FIXED",
              "counter": "AUTO"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 48,
          "visual": {
            "fills": [
              {
                "type": "SOLID",
                "color": {
                  "r": 0.8264723420143127,
                  "g": 0,
                  "b": 0.4683343470096588
                }
              }
            ],
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 7
          },
          "children": [
            {
              "type": "INSTANCE",
              "name": "ACEGeneralIcon",
              "width": 24,
              "height": 24,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "BOOLEAN_OPERATION",
                  "name": "Union",
                  "width": 19.5,
                  "height": 19.5,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 1,
                          "g": 1,
                          "b": 1
                        }
                      }
                    ]
                  },
                  "children": [
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 0.000003934024789487012,
                      "height": 18,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 0.000003934024789487012,
                      "height": 18,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 0.000003934024789487012,
                      "height": 18,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "RECTANGLE",
                      "name": "Rectangle",
                      "width": 4,
                      "height": 4,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5,
                        "cornerRadius": 64
                      }
                    },
                    {
                      "type": "RECTANGLE",
                      "name": "Rectangle",
                      "width": 4,
                      "height": 4,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5,
                        "cornerRadius": 64
                      }
                    },
                    {
                      "type": "RECTANGLE",
                      "name": "Rectangle",
                      "width": 4,
                      "height": 4,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5,
                        "cornerRadius": 64
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "TEXT",
              "name": "Text",
              "width": 44,
              "height": 7,
              "visual": {
                "fills": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 1,
                      "g": 1,
                      "b": 1
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "GENERAL",
                "fontFamily": "Protipo",
                "fontStyle": "Semibold",
                "fontSize": 10,
                "lineHeight": {
                  "unit": "AUTO"
                },
                "letterSpacing": {
                  "unit": "PIXELS",
                  "value": 0
                },
                "textAlignHorizontal": "CENTER",
                "textAlignVertical": "CENTER",
                "textCase": "ORIGINAL"
              }
            }
          ]
        },
        {
          "type": "FRAME",
          "name": "Assistants",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 12,
              "right": 8,
              "bottom": 12,
              "left": 8
            },
            "itemSpacing": 8,
            "sizing": {
              "primary": "FIXED",
              "counter": "AUTO"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 48,
          "visual": {
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 7
          },
          "children": [
            {
              "type": "INSTANCE",
              "name": "ACEAssistantsIcon",
              "width": 24,
              "height": 24,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "BOOLEAN_OPERATION",
                  "name": "Union",
                  "width": 19.500001907348633,
                  "height": 19.5,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.20000000298023224,
                          "g": 0.20000000298023224,
                          "b": 0.20000000298023224
                        }
                      }
                    ]
                  },
                  "children": [
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 18,
                      "height": 18,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "ELLIPSE",
                      "name": "Ellipse",
                      "width": 2,
                      "height": 2,
                      "visual": {
                        "fills": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 4,
                      "height": 5,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5,
                        "cornerRadius": 100
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "TEXT",
              "name": "Text",
              "width": 59,
              "height": 7,
              "visual": {
                "fills": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.20000000298023224,
                      "g": 0.20000000298023224,
                      "b": 0.20000000298023224
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "ASSISTANTS",
                "fontFamily": "Protipo",
                "fontStyle": "Semibold",
                "fontSize": 10,
                "lineHeight": {
                  "unit": "AUTO"
                },
                "letterSpacing": {
                  "unit": "PIXELS",
                  "value": 0
                },
                "textAlignHorizontal": "CENTER",
                "textAlignVertical": "CENTER",
                "textCase": "ORIGINAL"
              }
            }
          ]
        },
        {
          "type": "FRAME",
          "name": "Design_Systems",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 12,
              "right": 8,
              "bottom": 12,
              "left": 8
            },
            "itemSpacing": 8,
            "sizing": {
              "primary": "FIXED",
              "counter": "AUTO"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 48,
          "visual": {
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 7
          },
          "children": [
            {
              "type": "INSTANCE",
              "name": "ACEDesignSystemsIcon",
              "width": 24,
              "height": 24,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "BOOLEAN_OPERATION",
                  "name": "Union",
                  "width": 19.500001907348633,
                  "height": 19.5,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.20000000298023224,
                          "g": 0.20000000298023224,
                          "b": 0.20000000298023224
                        }
                      }
                    ]
                  },
                  "children": [
                    {
                      "type": "RECTANGLE",
                      "name": "Rounded Rectangle",
                      "width": 18,
                      "height": 18,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 0,
                      "height": 12,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 18,
                      "height": 0,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 12,
                      "height": 0,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "TEXT",
              "name": "Text",
              "width": 44,
              "height": 19,
              "visual": {
                "fills": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.20000000298023224,
                      "g": 0.20000000298023224,
                      "b": 0.20000000298023224
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "DESIGNSYSTEMS",
                "fontFamily": "Protipo",
                "fontStyle": "Semibold",
                "fontSize": 10,
                "lineHeight": {
                  "unit": "AUTO"
                },
                "letterSpacing": {
                  "unit": "PIXELS",
                  "value": 0
                },
                "textAlignHorizontal": "CENTER",
                "textAlignVertical": "CENTER",
                "textCase": "ORIGINAL"
              }
            }
          ]
        },
        {
          "type": "FRAME",
          "name": "Content_Tables",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 12,
              "right": 8,
              "bottom": 12,
              "left": 8
            },
            "itemSpacing": 8,
            "sizing": {
              "primary": "FIXED",
              "counter": "AUTO"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 48,
          "visual": {
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 7
          },
          "children": [
            {
              "type": "INSTANCE",
              "name": "ACEContentTablesIcon",
              "width": 24,
              "height": 24,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "BOOLEAN_OPERATION",
                  "name": "Union",
                  "width": 21.5,
                  "height": 21.5,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.20000000298023224,
                          "g": 0.20000000298023224,
                          "b": 0.20000000298023224
                        }
                      }
                    ]
                  },
                  "children": [
                    {
                      "type": "GROUP",
                      "name": "Larger",
                      "width": 20,
                      "height": 20,
                      "children": [
                        {
                          "type": "VECTOR",
                          "name": "Vector",
                          "width": 6,
                          "height": 6,
                          "visual": {
                            "strokes": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0,
                                  "g": 0,
                                  "b": 0
                                }
                              }
                            ],
                            "strokeWeight": 1.5,
                            "cornerRadius": 1
                          }
                        },
                        {
                          "type": "VECTOR",
                          "name": "Vector",
                          "width": 16,
                          "height": 16,
                          "visual": {
                            "strokes": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0,
                                  "g": 0,
                                  "b": 0
                                }
                              }
                            ],
                            "strokeWeight": 1.5
                          }
                        },
                        {
                          "type": "ELLIPSE",
                          "name": "Ellipse",
                          "width": 4,
                          "height": 4,
                          "visual": {
                            "strokes": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0,
                                  "g": 0,
                                  "b": 0
                                }
                              }
                            ],
                            "strokeWeight": 1.5
                          }
                        },
                        {
                          "type": "ELLIPSE",
                          "name": "Ellipse",
                          "width": 4,
                          "height": 4,
                          "visual": {
                            "strokes": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0,
                                  "g": 0,
                                  "b": 0
                                }
                              }
                            ],
                            "strokeWeight": 1.5
                          }
                        },
                        {
                          "type": "ELLIPSE",
                          "name": "Ellipse",
                          "width": 4,
                          "height": 4,
                          "visual": {
                            "strokes": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0,
                                  "g": 0,
                                  "b": 0
                                }
                              }
                            ],
                            "strokeWeight": 1.5
                          }
                        },
                        {
                          "type": "ELLIPSE",
                          "name": "Ellipse",
                          "width": 4,
                          "height": 4,
                          "visual": {
                            "strokes": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0,
                                  "g": 0,
                                  "b": 0
                                }
                              }
                            ],
                            "strokeWeight": 1.5
                          }
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              "type": "TEXT",
              "name": "Text",
              "width": 45,
              "height": 19,
              "visual": {
                "fills": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.20000000298023224,
                      "g": 0.20000000298023224,
                      "b": 0.20000000298023224
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "CONTENTTABLES",
                "fontFamily": "Protipo",
                "fontStyle": "Semibold",
                "fontSize": 10,
                "lineHeight": {
                  "unit": "AUTO"
                },
                "letterSpacing": {
                  "unit": "PIXELS",
                  "value": 0
                },
                "textAlignHorizontal": "CENTER",
                "textAlignVertical": "CENTER",
                "textCase": "ORIGINAL"
              }
            }
          ]
        },
        {
          "type": "FRAME",
          "name": "Rule",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 0,
              "right": 0,
              "bottom": 0,
              "left": 0
            },
            "itemSpacing": 10,
            "sizing": {
              "primary": "FIXED",
              "counter": "FIXED"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 1,
          "visual": {
            "fills": [
              {
                "type": "SOLID",
                "color": {
                  "r": 0.4000000059604645,
                  "g": 0.4000000059604645,
                  "b": 0.4000000059604645
                }
              }
            ],
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 60,
            "opacity": 0.6600000262260437
          }
        },
        {
          "type": "FRAME",
          "name": "Analytics",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 12,
              "right": 8,
              "bottom": 12,
              "left": 8
            },
            "itemSpacing": 8,
            "sizing": {
              "primary": "FIXED",
              "counter": "AUTO"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 48,
          "visual": {
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 7
          },
          "children": [
            {
              "type": "INSTANCE",
              "name": "ACEAnalyticsIcon",
              "width": 24,
              "height": 24,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "BOOLEAN_OPERATION",
                  "name": "Union",
                  "width": 19.5,
                  "height": 19.5000057220459,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.20000000298023224,
                          "g": 0.20000000298023224,
                          "b": 0.20000000298023224
                        }
                      }
                    ]
                  },
                  "children": [
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 9,
                      "height": 9,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 17.487884521484375,
                      "height": 17.5000057220459,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "TEXT",
              "name": "Text",
              "width": 55,
              "height": 17,
              "visual": {
                "fills": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.20000000298023224,
                      "g": 0.20000000298023224,
                      "b": 0.20000000298023224
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "ANALYTICS(Coming Soon)",
                "fontFamily": "Protipo",
                "fontStyle": "Semibold",
                "lineHeight": {
                  "unit": "AUTO"
                },
                "letterSpacing": {
                  "unit": "PIXELS",
                  "value": 0
                },
                "textAlignHorizontal": "CENTER",
                "textAlignVertical": "CENTER",
                "textCase": "ORIGINAL"
              }
            }
          ]
        }
      ]
    },
    {
      "type": "FRAME",
      "name": "Bottom",
      "layout": {
        "mode": "VERTICAL",
        "padding": {
          "top": 0,
          "right": 0,
          "bottom": 0,
          "left": 0
        },
        "itemSpacing": 16,
        "sizing": {
          "primary": "AUTO",
          "counter": "FIXED"
        },
        "align": "STRETCH"
      },
      "width": 128,
      "height": 176,
      "visual": {
        "strokeWeight": 1,
        "strokeAlign": "INSIDE"
      },
      "children": [
        {
          "type": "FRAME",
          "name": "Help",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 12,
              "right": 8,
              "bottom": 12,
              "left": 8
            },
            "itemSpacing": 8,
            "sizing": {
              "primary": "FIXED",
              "counter": "AUTO"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 48,
          "visual": {
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 7
          },
          "children": [
            {
              "type": "INSTANCE",
              "name": "ACEHelpIcon",
              "width": 24,
              "height": 24,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "BOOLEAN_OPERATION",
                  "name": "Union",
                  "width": 19.5,
                  "height": 19.5,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.20000000298023224,
                          "g": 0.20000000298023224,
                          "b": 0.20000000298023224
                        }
                      }
                    ],
                    "strokeWeight": 1.5
                  },
                  "children": [
                    {
                      "type": "ELLIPSE",
                      "name": "Ellipse",
                      "width": 18,
                      "height": 18,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "ELLIPSE",
                      "name": "Ellipse",
                      "width": 2,
                      "height": 2,
                      "visual": {
                        "fills": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 4,
                      "height": 5,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "TEXT",
              "name": "Text",
              "width": 25,
              "height": 7,
              "visual": {
                "fills": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.20000000298023224,
                      "g": 0.20000000298023224,
                      "b": 0.20000000298023224
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "HELP",
                "fontFamily": "Protipo",
                "fontStyle": "Semibold",
                "fontSize": 10,
                "lineHeight": {
                  "unit": "AUTO"
                },
                "letterSpacing": {
                  "unit": "PIXELS",
                  "value": 0
                },
                "textAlignHorizontal": "CENTER",
                "textAlignVertical": "CENTER",
                "textCase": "ORIGINAL"
              }
            }
          ]
        },
        {
          "type": "FRAME",
          "name": "Server_Status",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 12,
              "right": 8,
              "bottom": 12,
              "left": 8
            },
            "itemSpacing": 8,
            "sizing": {
              "primary": "FIXED",
              "counter": "AUTO"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 48,
          "visual": {
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 7
          },
          "children": [
            {
              "type": "INSTANCE",
              "name": "ACEServerIcon",
              "width": 24,
              "height": 24,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "BOOLEAN_OPERATION",
                  "name": "Union",
                  "width": 19.5,
                  "height": 19.5,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.20000000298023224,
                          "g": 0.20000000298023224,
                          "b": 0.20000000298023224
                        }
                      }
                    ]
                  },
                  "children": [
                    {
                      "type": "RECTANGLE",
                      "name": "Rounded Rectangle",
                      "width": 18,
                      "height": 6,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "RECTANGLE",
                      "name": "Rounded Rectangle",
                      "width": 18,
                      "height": 6,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "RECTANGLE",
                      "name": "Rounded Rectangle",
                      "width": 18,
                      "height": 6,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "ELLIPSE",
                      "name": "Ellipse",
                      "width": 2,
                      "height": 2,
                      "visual": {
                        "fills": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "ELLIPSE",
                      "name": "Ellipse",
                      "width": 2,
                      "height": 2,
                      "visual": {
                        "fills": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "ELLIPSE",
                      "name": "Ellipse",
                      "width": 2,
                      "height": 2,
                      "visual": {
                        "fills": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "TEXT",
              "name": "Text",
              "width": 52,
              "height": 19,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "Server: Connected",
                "fontFamily": "Protipo",
                "fontStyle": "Semibold",
                "fontSize": 10,
                "lineHeight": {
                  "unit": "AUTO"
                },
                "letterSpacing": {
                  "unit": "PIXELS",
                  "value": 0
                },
                "textAlignHorizontal": "LEFT",
                "textAlignVertical": "CENTER",
                "textCase": "ORIGINAL"
              }
            }
          ]
        },
        {
          "type": "FRAME",
          "name": "User_Profile",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 12,
              "right": 8,
              "bottom": 12,
              "left": 8
            },
            "itemSpacing": 8,
            "sizing": {
              "primary": "FIXED",
              "counter": "AUTO"
            },
            "align": "STRETCH"
          },
          "width": 128,
          "height": 48,
          "visual": {
            "strokes": [
              {
                "type": "SOLID",
                "color": {
                  "r": 0.4000000059604645,
                  "g": 0.4000000059604645,
                  "b": 0.4000000059604645
                }
              }
            ],
            "strokeWeight": 1,
            "strokeAlign": "INSIDE",
            "cornerRadius": 7
          },
          "children": [
            {
              "type": "INSTANCE",
              "name": "ACEUserIcon",
              "width": 24,
              "height": 24,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "BOOLEAN_OPERATION",
                  "name": "Union",
                  "width": 21.5,
                  "height": 21.5,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.20000000298023224,
                          "g": 0.20000000298023224,
                          "b": 0.20000000298023224
                        }
                      }
                    ]
                  },
                  "children": [
                    {
                      "type": "ELLIPSE",
                      "name": "Ellipse",
                      "width": 20,
                      "height": 20,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "VECTOR",
                      "name": "Vector",
                      "width": 8,
                      "height": 4,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    },
                    {
                      "type": "ELLIPSE",
                      "name": "Ellipse",
                      "width": 4,
                      "height": 4,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0,
                              "g": 0,
                              "b": 0
                            }
                          }
                        ],
                        "strokeWeight": 1.5
                      }
                    }
                  ]
                }
              ]
            },
            {
              "type": "TEXT",
              "name": "Text",
              "width": 39,
              "height": 19,
              "visual": {
                "fills": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.20000000298023224,
                      "g": 0.20000000298023224,
                      "b": 0.20000000298023224
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "Biagio Goetzke",
                "fontFamily": "Protipo",
                "fontStyle": "Semibold",
                "fontSize": 10,
                "lineHeight": {
                  "unit": "AUTO"
                },
                "letterSpacing": {
                  "unit": "PIXELS",
                  "value": 0
                },
                "textAlignHorizontal": "LEFT",
                "textAlignVertical": "CENTER",
                "textCase": "ORIGINAL"
              }
            }
          ]
        }
      ]
    }
  ]
}