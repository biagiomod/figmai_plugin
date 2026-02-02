{
  "type": "FRAME",
  "name": "Admin",
  "layout": {
    "mode": "VERTICAL",
    "padding": {
      "top": 0,
      "right": 0,
      "bottom": 0,
      "left": 0
    },
    "itemSpacing": 0,
    "sizing": {
      "primary": "FIXED",
      "counter": "FIXED"
    }
  },
  "width": 1168,
  "height": 3615,
  "visual": {
    "fills": [
      {
        "type": "SOLID",
        "color": {
          "r": 0.949999988079071,
          "g": 0.949999988079071,
          "b": 0.949999988079071
        }
      }
    ],
    "strokes": [
      {
        "type": "SOLID",
        "color": {
          "r": 0.7931941151618958,
          "g": 0.7931941151618958,
          "b": 0.7931941151618958
        }
      }
    ],
    "strokeWeight": 1,
    "strokeAlign": "OUTSIDE",
    "cornerRadius": 24
  },
  "children": [
    {
      "type": "FRAME",
      "name": "Top Nav",
      "layout": {
        "mode": "HORIZONTAL",
        "padding": {
          "top": 24,
          "right": 32,
          "bottom": 24,
          "left": 32
        },
        "itemSpacing": 1200,
        "sizing": {
          "primary": "FIXED",
          "counter": "AUTO"
        },
        "align": "STRETCH"
      },
      "width": 1168,
      "height": 88,
      "visual": {
        "fills": [
          {
            "type": "SOLID",
            "color": {
              "r": 0.949999988079071,
              "g": 0.949999988079071,
              "b": 0.949999988079071
            }
          }
        ],
        "strokeWeight": 1,
        "strokeAlign": "INSIDE"
      },
      "children": [
        {
          "type": "FRAME",
          "name": "Logo",
          "layout": {
            "mode": "HORIZONTAL",
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
            }
          },
          "width": 346,
          "height": 26,
          "visual": {
            "strokeWeight": 2.1204426288604736,
            "strokeAlign": "INSIDE"
          },
          "children": [
            {
              "type": "TEXT",
              "name": "FigmAI",
              "width": 122,
              "height": 26,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "FigmAI",
                "fontFamily": "Radikal",
                "fontStyle": "Bold",
                "fontSize": 36,
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
            },
            {
              "type": "TEXT",
              "name": "ACE (Admin Config Editor)",
              "width": 208,
              "height": 9,
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
                "strokeAlign": "OUTSIDE"
              },
              "text": {
                "characters": "ACE (Admin Config Editor)",
                "fontFamily": "Carbon",
                "fontStyle": "Bold",
                "fontSize": 16,
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
          "name": "Actions",
          "layout": {
            "mode": "HORIZONTAL",
            "padding": {
              "top": 0,
              "right": 0,
              "bottom": 0,
              "left": 0
            },
            "itemSpacing": 16,
            "sizing": {
              "primary": "AUTO",
              "counter": "AUTO"
            }
          },
          "width": 444,
          "height": 40,
          "visual": {
            "strokeWeight": 1,
            "strokeAlign": "INSIDE"
          },
          "children": [
            {
              "type": "FRAME",
              "name": "Button",
              "layout": {
                "mode": "HORIZONTAL",
                "padding": {
                  "top": 8,
                  "right": 16,
                  "bottom": 8,
                  "left": 16
                },
                "itemSpacing": 4,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                }
              },
              "width": 74,
              "height": 40,
              "visual": {
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.8352941274642944,
                      "g": 0.0470588244497776,
                      "b": 0.4901960790157318
                    }
                  }
                ],
                "strokeWeight": 1,
                "cornerRadius": 8
              },
              "children": [
                {
                  "type": "TEXT",
                  "name": "Text",
                  "width": 42,
                  "height": 10,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.8352941274642944,
                          "g": 0.0470588244497776,
                          "b": 0.4901960790157318
                        }
                      }
                    ],
                    "strokeWeight": 1,
                    "strokeAlign": "OUTSIDE"
                  },
                  "text": {
                    "characters": "RESET",
                    "fontFamily": "Protipo",
                    "fontStyle": "Semibold",
                    "fontSize": 14,
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
              "name": "Button",
              "layout": {
                "mode": "HORIZONTAL",
                "padding": {
                  "top": 8,
                  "right": 16,
                  "bottom": 8,
                  "left": 16
                },
                "itemSpacing": 4,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                }
              },
              "width": 96,
              "height": 40,
              "visual": {
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.8352941274642944,
                      "g": 0.0470588244497776,
                      "b": 0.4901960790157318
                    }
                  }
                ],
                "strokeWeight": 1,
                "cornerRadius": 8
              },
              "children": [
                {
                  "type": "TEXT",
                  "name": "Text",
                  "width": 64,
                  "height": 10,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.8352941274642944,
                          "g": 0.0470588244497776,
                          "b": 0.4901960790157318
                        }
                      }
                    ],
                    "strokeWeight": 1,
                    "strokeAlign": "OUTSIDE"
                  },
                  "text": {
                    "characters": "VALIDATE",
                    "fontFamily": "Protipo",
                    "fontStyle": "Semibold",
                    "fontSize": 14,
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
              "name": "Button",
              "layout": {
                "mode": "HORIZONTAL",
                "padding": {
                  "top": 8,
                  "right": 16,
                  "bottom": 8,
                  "left": 16
                },
                "itemSpacing": 4,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                }
              },
              "width": 160,
              "height": 40,
              "visual": {
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.8352941274642944,
                      "g": 0.0470588244497776,
                      "b": 0.4901960790157318
                    }
                  }
                ],
                "strokeWeight": 1,
                "cornerRadius": 8
              },
              "children": [
                {
                  "type": "TEXT",
                  "name": "Text",
                  "width": 128,
                  "height": 10,
                  "visual": {
                    "fills": [
                      {
                        "type": "SOLID",
                        "color": {
                          "r": 0.8352941274642944,
                          "g": 0.0470588244497776,
                          "b": 0.4901960790157318
                        }
                      }
                    ],
                    "strokeWeight": 1,
                    "strokeAlign": "OUTSIDE"
                  },
                  "text": {
                    "characters": "PREVIEW CHANGES",
                    "fontFamily": "Protipo",
                    "fontStyle": "Semibold",
                    "fontSize": 14,
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
              "name": "Button",
              "layout": {
                "mode": "HORIZONTAL",
                "padding": {
                  "top": 8,
                  "right": 16,
                  "bottom": 8,
                  "left": 16
                },
                "itemSpacing": 4,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                }
              },
              "width": 66,
              "height": 40,
              "visual": {
                "fills": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.8352941274642944,
                      "g": 0.0470588244497776,
                      "b": 0.4901960790157318
                    }
                  }
                ],
                "strokeWeight": 1,
                "cornerRadius": 8
              },
              "children": [
                {
                  "type": "TEXT",
                  "name": "Text",
                  "width": 34,
                  "height": 10,
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
                    "characters": "SAVE",
                    "fontFamily": "Protipo",
                    "fontStyle": "Semibold",
                    "fontSize": 14,
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
    },
    {
      "type": "FRAME",
      "name": "Body",
      "layout": {
        "mode": "HORIZONTAL",
        "padding": {
          "top": 0,
          "right": 0,
          "bottom": 0,
          "left": 0
        },
        "itemSpacing": 0,
        "sizing": {
          "primary": "FIXED",
          "counter": "AUTO"
        },
        "align": "STRETCH"
      },
      "width": 1168,
      "height": 3527,
      "visual": {
        "strokeWeight": 1,
        "strokeAlign": "INSIDE"
      },
      "children": [
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
                  "name": "Tab_Active",
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
                      "name": "Settings - Sliders - Vert - Complex",
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
                  "name": "Tab_Active",
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
                      "name": "Comment - 2 - Question",
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
                  "name": "Tab_Active",
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
                      "name": "Grid - Rect - Navbar - Mixed - 3",
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
                  "name": "Tab_Active",
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
                      "name": "Text Format",
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
                  "name": "Tab_Active",
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
                      "name": "Chart - Pie",
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
                  "name": "Tab_Active",
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
                      "name": " Question - Help - FAQ - Support",
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
                  "name": "Tab_Active",
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
                      "name": "Server - Rect - Dots",
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
                  "name": "Tab_Active",
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
                      "name": "User - Circle",
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
        },
        {
          "type": "FRAME",
          "name": "Main",
          "layout": {
            "mode": "VERTICAL",
            "padding": {
              "top": 32,
              "right": 32,
              "bottom": 32,
              "left": 32
            },
            "itemSpacing": 32,
            "sizing": {
              "primary": "AUTO",
              "counter": "FIXED"
            },
            "grow": 1
          },
          "width": 1008,
          "height": 3527,
          "visual": {
            "fills": [
              {
                "type": "SOLID",
                "color": {
                  "r": 0.9800000190734863,
                  "g": 0.9800000190734863,
                  "b": 0.9800000190734863
                }
              }
            ],
            "strokeWeight": 1,
            "strokeAlign": "INSIDE"
          },
          "children": [
            {
              "type": "FRAME",
              "name": "Page Title Group",
              "layout": {
                "mode": "HORIZONTAL",
                "padding": {
                  "top": 0,
                  "right": 0,
                  "bottom": 0,
                  "left": 0
                },
                "itemSpacing": 0,
                "sizing": {
                  "primary": "FIXED",
                  "counter": "AUTO"
                },
                "align": "STRETCH"
              },
              "width": 944,
              "height": 40,
              "visual": {
                "strokeWeight": 1,
                "strokeAlign": "INSIDE"
              },
              "children": [
                {
                  "type": "FRAME",
                  "name": "Page Title and Desc",
                  "layout": {
                    "mode": "VERTICAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 8,
                    "sizing": {
                      "primary": "AUTO",
                      "counter": "AUTO"
                    }
                  },
                  "width": 267,
                  "height": 17,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "TEXT",
                      "name": "Title",
                      "width": 267,
                      "height": 17,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "General Plugin Settings",
                        "fontFamily": "Protipo",
                        "fontStyle": "Bold",
                        "fontSize": 24,
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
                  "name": "Actions",
                  "layout": {
                    "mode": "HORIZONTAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 16,
                    "sizing": {
                      "primary": "AUTO",
                      "counter": "AUTO"
                    }
                  },
                  "width": 207,
                  "height": 40,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Button",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 8,
                          "right": 16,
                          "bottom": 8,
                          "left": 16
                        },
                        "itemSpacing": 4,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "FIXED"
                        }
                      },
                      "width": 207,
                      "height": 40,
                      "visual": {
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0.8352941274642944,
                              "g": 0.0470588244497776,
                              "b": 0.4901960790157318
                            }
                          }
                        ],
                        "strokeWeight": 1,
                        "cornerRadius": 8
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 175,
                          "height": 10,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.8352941274642944,
                                  "g": 0.0470588244497776,
                                  "b": 0.4901960790157318
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "OUTSIDE"
                          },
                          "text": {
                            "characters": "RESET THIS SECTION ONLY",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
            },
            {
              "type": "FRAME",
              "name": "Row",
              "layout": {
                "mode": "VERTICAL",
                "padding": {
                  "top": 16,
                  "right": 16,
                  "bottom": 16,
                  "left": 16
                },
                "itemSpacing": 24,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                },
                "align": "STRETCH"
              },
              "width": 944,
              "height": 129,
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
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.800000011920929,
                      "g": 0.800000011920929,
                      "b": 0.800000011920929
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "INSIDE",
                "cornerRadius": 12
              },
              "children": [
                {
                  "type": "FRAME",
                  "name": "Title",
                  "layout": {
                    "mode": "VERTICAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 12,
                    "sizing": {
                      "primary": "AUTO",
                      "counter": "FIXED"
                    },
                    "align": "STRETCH"
                  },
                  "width": 912,
                  "height": 33,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 113,
                      "height": 13,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Default Mode",
                        "fontFamily": "Protipo",
                        "fontStyle": "Semibold",
                        "fontSize": 18,
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
                    },
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 357,
                      "height": 8,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Choose what level of complexity to show the user upon opening",
                        "fontFamily": "Protipo",
                        "fontStyle": "Regular",
                        "fontSize": 12,
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
                  "name": "Segmented Button",
                  "layout": {
                    "mode": "HORIZONTAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 0,
                    "sizing": {
                      "primary": "AUTO",
                      "counter": "AUTO"
                    }
                  },
                  "width": 174,
                  "height": 40,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Button",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 8,
                          "right": 16,
                          "bottom": 8,
                          "left": 16
                        },
                        "itemSpacing": 4,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "FIXED"
                        }
                      },
                      "width": 77,
                      "height": 40,
                      "visual": {
                        "fills": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0.8352941274642944,
                              "g": 0.0470588244497776,
                              "b": 0.4901960790157318
                            }
                          }
                        ],
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0.20000000298023224,
                              "g": 0.20000000298023224,
                              "b": 0.20000000298023224
                            }
                          }
                        ],
                        "strokeWeight": 1
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 45,
                          "height": 10,
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
                            "characters": "Simple",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Button",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 8,
                          "right": 16,
                          "bottom": 8,
                          "left": 16
                        },
                        "itemSpacing": 4,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "FIXED"
                        }
                      },
                      "width": 97,
                      "height": 40,
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
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0.20000000298023224,
                              "g": 0.20000000298023224,
                              "b": 0.20000000298023224
                            }
                          }
                        ],
                        "strokeWeight": 1
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 65,
                          "height": 10,
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
                            "characters": "Advanced",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
            },
            {
              "type": "FRAME",
              "name": "Row",
              "layout": {
                "mode": "VERTICAL",
                "padding": {
                  "top": 16,
                  "right": 16,
                  "bottom": 16,
                  "left": 16
                },
                "itemSpacing": 24,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                },
                "align": "STRETCH"
              },
              "width": 944,
              "height": 539,
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
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.800000011920929,
                      "g": 0.800000011920929,
                      "b": 0.800000011920929
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "INSIDE",
                "cornerRadius": 12
              },
              "children": [
                {
                  "type": "FRAME",
                  "name": "Title",
                  "layout": {
                    "mode": "VERTICAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 12,
                    "sizing": {
                      "primary": "AUTO",
                      "counter": "FIXED"
                    },
                    "align": "STRETCH"
                  },
                  "width": 912,
                  "height": 33,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 122,
                      "height": 13,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Mode Settings",
                        "fontFamily": "Protipo",
                        "fontStyle": "Semibold",
                        "fontSize": 18,
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
                    },
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 258,
                      "height": 8,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Choose what Assistants are visible to the user",
                        "fontFamily": "Protipo",
                        "fontStyle": "Regular",
                        "fontSize": 12,
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
                  "name": "Two Columns",
                  "layout": {
                    "mode": "HORIZONTAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 40,
                    "sizing": {
                      "primary": "FIXED",
                      "counter": "AUTO"
                    },
                    "align": "STRETCH"
                  },
                  "width": 912,
                  "height": 450,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Column",
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
                        "grow": 1
                      },
                      "width": 436,
                      "height": 450,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 45,
                          "height": 10,
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
                            "characters": "Simple",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                        },
                        {
                          "type": "FRAME",
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 14.583335876464844,
                                      "height": 11.250003814697266,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "General",
                              "width": 52,
                              "height": 10,
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
                                "characters": "General",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.20000000298023224,
                                      "g": 0.20000000298023224,
                                      "b": 0.20000000298023224
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 0,
                                      "height": 0,
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
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "type": "TEXT",
                              "name": "Accessibility",
                              "width": 82,
                              "height": 10,
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
                                "characters": "Accessibility",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.20000000298023224,
                                      "g": 0.20000000298023224,
                                      "b": 0.20000000298023224
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 0,
                                      "height": 0,
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
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "type": "TEXT",
                              "name": "Analytics Tagging",
                              "width": 115,
                              "height": 10,
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
                                "characters": "Analytics Tagging",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.20000000298023224,
                                      "g": 0.20000000298023224,
                                      "b": 0.20000000298023224
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 0,
                                      "height": 0,
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
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "type": "TEXT",
                              "name": "Content Review",
                              "width": 103,
                              "height": 10,
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
                                "characters": "Content Review",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Content Table",
                              "width": 91,
                              "height": 10,
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
                                "characters": "Content Table",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.20000000298023224,
                                      "g": 0.20000000298023224,
                                      "b": 0.20000000298023224
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 0,
                                      "height": 0,
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
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "type": "TEXT",
                              "name": "Discovery Copilot",
                              "width": 115,
                              "height": 10,
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
                                "characters": "Discovery Copilot",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Design Workshop",
                              "width": 116,
                              "height": 10,
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
                                "characters": "Design Workshop",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Design Critique",
                              "width": 102,
                              "height": 10,
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
                                "characters": "Design Critique",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.20000000298023224,
                                      "g": 0.20000000298023224,
                                      "b": 0.20000000298023224
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 0,
                                      "height": 0,
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
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "type": "TEXT",
                              "name": "Code2Design",
                              "width": 87,
                              "height": 10,
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
                                "characters": "Code2Design",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.20000000298023224,
                                      "g": 0.20000000298023224,
                                      "b": 0.20000000298023224
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 0,
                                      "height": 0,
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
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "type": "TEXT",
                              "name": "Dev Handoff",
                              "width": 80,
                              "height": 10,
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
                                "characters": "Dev Handoff",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.20000000298023224,
                                      "g": 0.20000000298023224,
                                      "b": 0.20000000298023224
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 0,
                                      "height": 0,
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
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "type": "TEXT",
                              "name": "Errors",
                              "width": 45,
                              "height": 10,
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
                                "characters": "Errors",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Column",
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
                        "grow": 1
                      },
                      "width": 436,
                      "height": 450,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 65,
                          "height": 10,
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
                            "characters": "Advanced",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
                            "lineHeight": {
                              "unit": "AUTO"
                            },
                            "letterSpacing": {
                              "unit": "PIXELS",
                              "value": 0
                            },
                            "textAlignHorizontal": "LEFT",
                            "textAlignVertical": "CENTER",
                            "textCase": "TITLE"
                          }
                        },
                        {
                          "type": "FRAME",
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "General",
                              "width": 52,
                              "height": 10,
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
                                "characters": "General",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Accessibility",
                              "width": 82,
                              "height": 10,
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
                                "characters": "Accessibility",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Analytics Tagging",
                              "width": 115,
                              "height": 10,
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
                                "characters": "Analytics Tagging",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Content Review",
                              "width": 103,
                              "height": 10,
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
                                "characters": "Content Review",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Content Table",
                              "width": 91,
                              "height": 10,
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
                                "characters": "Content Table",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Discovery Copilot",
                              "width": 115,
                              "height": 10,
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
                                "characters": "Discovery Copilot",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Design Workshop",
                              "width": 116,
                              "height": 10,
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
                                "characters": "Design Workshop",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Design Critique",
                              "width": 102,
                              "height": 10,
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
                                "characters": "Design Critique",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Code2Design",
                              "width": 87,
                              "height": 10,
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
                                "characters": "Code2Design",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.20000000298023224,
                                      "g": 0.20000000298023224,
                                      "b": 0.20000000298023224
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 0,
                                      "height": 0,
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
                                      }
                                    }
                                  ]
                                }
                              ]
                            },
                            {
                              "type": "TEXT",
                              "name": "Dev Handoff",
                              "width": 80,
                              "height": 10,
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
                                "characters": "Dev Handoff",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
                          "name": "Row",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 0,
                              "right": 0,
                              "bottom": 0,
                              "left": 0
                            },
                            "itemSpacing": 12,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "AUTO"
                            },
                            "align": "STRETCH"
                          },
                          "width": 436,
                          "height": 24,
                          "visual": {
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Checkbox",
                              "layout": {
                                "mode": "HORIZONTAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 0,
                                "sizing": {
                                  "primary": "FIXED",
                                  "counter": "FIXED"
                                }
                              },
                              "width": 24,
                              "height": 24,
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
                                "strokes": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ],
                                "strokeWeight": 1.6666666269302368,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "INSTANCE",
                                  "name": "Check",
                                  "width": 20,
                                  "height": 20,
                                  "visual": {
                                    "strokeWeight": 0.8333333134651184,
                                    "strokeAlign": "INSIDE"
                                  },
                                  "children": [
                                    {
                                      "type": "BOOLEAN_OPERATION",
                                      "name": "Icon",
                                      "width": 15.332962989807129,
                                      "height": 12.000237464904785,
                                      "visual": {
                                        "fills": [
                                          {
                                            "type": "SOLID",
                                            "color": {
                                              "r": 0.8352941274642944,
                                              "g": 0.0470588244497776,
                                              "b": 0.4901960790157318
                                            }
                                          }
                                        ]
                                      },
                                      "children": [
                                        {
                                          "type": "VECTOR",
                                          "name": "Vector",
                                          "width": 13.333333015441895,
                                          "height": 10,
                                          "visual": {
                                            "strokes": [
                                              {
                                                "type": "SOLID",
                                                "color": {
                                                  "r": 0.8352941274642944,
                                                  "g": 0.0470588244497776,
                                                  "b": 0.4901960790157318
                                                }
                                              }
                                            ],
                                            "strokeWeight": 2
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
                              "name": "Errors",
                              "width": 45,
                              "height": 10,
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
                                "characters": "Errors",
                                "fontFamily": "Protipo",
                                "fontStyle": "Regular",
                                "fontSize": 14,
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
              ]
            },
            {
              "type": "FRAME",
              "name": "Row",
              "layout": {
                "mode": "VERTICAL",
                "padding": {
                  "top": 16,
                  "right": 16,
                  "bottom": 16,
                  "left": 16
                },
                "itemSpacing": 24,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                },
                "align": "STRETCH"
              },
              "width": 944,
              "height": 181,
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
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.800000011920929,
                      "g": 0.800000011920929,
                      "b": 0.800000011920929
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "INSIDE",
                "cornerRadius": 12
              },
              "children": [
                {
                  "type": "FRAME",
                  "name": "Title",
                  "layout": {
                    "mode": "VERTICAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 12,
                    "sizing": {
                      "primary": "AUTO",
                      "counter": "FIXED"
                    },
                    "align": "STRETCH"
                  },
                  "width": 912,
                  "height": 33,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 134,
                      "height": 13,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "AI API Endpoint",
                        "fontFamily": "Protipo",
                        "fontStyle": "Semibold",
                        "fontSize": 18,
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
                    },
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 235,
                      "height": 8,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Provide the LLM URL to enable AI features",
                        "fontFamily": "Protipo",
                        "fontStyle": "Regular",
                        "fontSize": 12,
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
                  "name": "Text Input Group",
                  "layout": {
                    "mode": "HORIZONTAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 16,
                    "sizing": {
                      "primary": "FIXED",
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 44,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Input",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 8,
                          "right": 16,
                          "bottom": 8,
                          "left": 16
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "FIXED"
                        },
                        "grow": 1
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "fills": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0.949999988079071,
                              "g": 0.949999988079071,
                              "b": 0.949999988079071
                            }
                          }
                        ],
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE",
                        "cornerRadius": 8
                      },
                      "children": [
                        {
                          "type": "INSTANCE",
                          "name": "Link - URL - Tilted",
                          "width": 20,
                          "height": 20,
                          "visual": {
                            "strokeWeight": 0.8333333730697632,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "BOOLEAN_OPERATION",
                              "name": "Union",
                              "width": 15.475210189819336,
                              "height": 15.475260734558105,
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
                                  "width": 8.333333969116211,
                                  "height": 10,
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
                                    "strokeWeight": 1.25
                                  }
                                },
                                {
                                  "type": "VECTOR",
                                  "name": "Vector",
                                  "width": 8.333333969116211,
                                  "height": 10,
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
                                    "strokeWeight": 1.25
                                  }
                                }
                              ]
                            }
                          ]
                        },
                        {
                          "type": "TEXT",
                          "name": "Enter API Endpoint URL",
                          "width": 154,
                          "height": 10,
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
                            "strokeAlign": "OUTSIDE"
                          },
                          "text": {
                            "characters": "Enter API Endpoint URL",
                            "fontFamily": "Protipo",
                            "fontStyle": "Regular",
                            "fontSize": 14,
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
                },
                {
                  "type": "FRAME",
                  "name": "Row",
                  "layout": {
                    "mode": "HORIZONTAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 12,
                    "sizing": {
                      "primary": "FIXED",
                      "counter": "AUTO"
                    },
                    "align": "STRETCH"
                  },
                  "width": 912,
                  "height": 24,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Checkbox",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 0,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "FIXED"
                        }
                      },
                      "width": 24,
                      "height": 24,
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
                        "strokes": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0.8352941274642944,
                              "g": 0.0470588244497776,
                              "b": 0.4901960790157318
                            }
                          }
                        ],
                        "strokeWeight": 1.6666666269302368,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "INSTANCE",
                          "name": "Check",
                          "width": 20,
                          "height": 20,
                          "visual": {
                            "strokeWeight": 0.8333333134651184,
                            "strokeAlign": "INSIDE"
                          },
                          "children": [
                            {
                              "type": "BOOLEAN_OPERATION",
                              "name": "Icon",
                              "width": 15.332962989807129,
                              "height": 12.000237464904785,
                              "visual": {
                                "fills": [
                                  {
                                    "type": "SOLID",
                                    "color": {
                                      "r": 0.8352941274642944,
                                      "g": 0.0470588244497776,
                                      "b": 0.4901960790157318
                                    }
                                  }
                                ]
                              },
                              "children": [
                                {
                                  "type": "VECTOR",
                                  "name": "Vector",
                                  "width": 13.333333015441895,
                                  "height": 10,
                                  "visual": {
                                    "strokes": [
                                      {
                                        "type": "SOLID",
                                        "color": {
                                          "r": 0.8352941274642944,
                                          "g": 0.0470588244497776,
                                          "b": 0.4901960790157318
                                        }
                                      }
                                    ],
                                    "strokeWeight": 2
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
                      "name": "Hide endpoint settings in plugin",
                      "width": 208,
                      "height": 10,
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
                        "characters": "Hide endpoint settings in plugin",
                        "fontFamily": "Protipo",
                        "fontStyle": "Regular",
                        "fontSize": 14,
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
            },
            {
              "type": "FRAME",
              "name": "Row",
              "layout": {
                "mode": "VERTICAL",
                "padding": {
                  "top": 16,
                  "right": 16,
                  "bottom": 16,
                  "left": 16
                },
                "itemSpacing": 32,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                },
                "align": "STRETCH"
              },
              "width": 944,
              "height": 565,
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
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.800000011920929,
                      "g": 0.800000011920929,
                      "b": 0.800000011920929
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "INSIDE",
                "cornerRadius": 12
              },
              "children": [
                {
                  "type": "FRAME",
                  "name": "Title",
                  "layout": {
                    "mode": "VERTICAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 12,
                    "sizing": {
                      "primary": "AUTO",
                      "counter": "FIXED"
                    },
                    "align": "STRETCH"
                  },
                  "width": 912,
                  "height": 47,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 130,
                      "height": 13,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Resource Links",
                        "fontFamily": "Protipo",
                        "fontStyle": "Semibold",
                        "fontSize": 18,
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
                    },
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 310,
                      "height": 22,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Include helpful links in the Resources & Credits sectionLeave fields blank to hide button",
                        "fontFamily": "Protipo",
                        "fontStyle": "Regular",
                        "fontSize": 12,
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
                  "name": "Group 1",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 53,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 53,
                          "height": 10,
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
                            "characters": "Button 1",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 40,
                              "height": 25,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 25,
                                  "height": 7,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
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
                                },
                                {
                                  "type": "TEXT",
                                  "name": "About",
                                  "width": 40,
                                  "height": 10,
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
                                    "characters": "About",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 162,
                              "height": 25,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 19,
                                  "height": 7,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
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
                                },
                                {
                                  "type": "TEXT",
                                  "name": "https://www.google.com",
                                  "width": 162,
                                  "height": 10,
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
                                    "characters": "https://www.google.com",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Group 3",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 56,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 56,
                          "height": 10,
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
                            "characters": "Button 2",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Group 5",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 56,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 56,
                          "height": 10,
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
                            "characters": "Button 3",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                }
              ]
            },
            {
              "type": "FRAME",
              "name": "Row",
              "layout": {
                "mode": "VERTICAL",
                "padding": {
                  "top": 16,
                  "right": 16,
                  "bottom": 16,
                  "left": 16
                },
                "itemSpacing": 24,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                },
                "align": "STRETCH"
              },
              "width": 944,
              "height": 1515,
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
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.800000011920929,
                      "g": 0.800000011920929,
                      "b": 0.800000011920929
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "INSIDE",
                "cornerRadius": 12
              },
              "children": [
                {
                  "type": "FRAME",
                  "name": "Title",
                  "layout": {
                    "mode": "VERTICAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 12,
                    "sizing": {
                      "primary": "AUTO",
                      "counter": "FIXED"
                    },
                    "align": "STRETCH"
                  },
                  "width": 912,
                  "height": 47,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 64,
                      "height": 13,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Credits",
                        "fontFamily": "Protipo",
                        "fontStyle": "Semibold",
                        "fontSize": 18,
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
                    },
                    {
                      "type": "TEXT",
                      "name": "Text",
                      "width": 164,
                      "height": 22,
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
                        "strokeWeight": 1,
                        "strokeAlign": "OUTSIDE"
                      },
                      "text": {
                        "characters": "Share the loveLeave fields blank to hide slot",
                        "fontFamily": "Protipo",
                        "fontStyle": "Regular",
                        "fontSize": 12,
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
                  "name": "Group 1",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 111,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 111,
                          "height": 10,
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
                            "characters": "Created By Slot 1",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 53,
                              "height": 25,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 25,
                                  "height": 7,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
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
                                },
                                {
                                  "type": "TEXT",
                                  "name": "Biagio G",
                                  "width": 53,
                                  "height": 10,
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
                                    "characters": "Biagio G",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 162,
                              "height": 25,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 19,
                                  "height": 7,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
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
                                },
                                {
                                  "type": "TEXT",
                                  "name": "https://www.google.com",
                                  "width": 162,
                                  "height": 10,
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
                                    "characters": "https://www.google.com",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Group 3",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 113,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 113,
                          "height": 10,
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
                            "characters": "Created By Slot 2",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Group 5",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 113,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 113,
                          "height": 10,
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
                            "characters": "Created By Slot 3",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  "width": 482.5,
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
                  "name": "Group 12",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 100,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 100,
                          "height": 10,
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
                            "characters": "API Team Slot 1",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Group 7",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 103,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 103,
                          "height": 10,
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
                            "characters": "API Team Slot 2",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Group 8",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 103,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 103,
                          "height": 10,
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
                            "characters": "API Team Slot 3",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  "width": 482.5,
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
                  "name": "Group 13",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 130,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 130,
                          "height": 10,
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
                            "characters": "Content Team Slot 1",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Group 14",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 132,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 132,
                          "height": 10,
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
                            "characters": "Content Team Slot 2",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Group 15",
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
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 130,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Desc",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 133,
                      "height": 10,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Text",
                          "width": 133,
                          "height": 10,
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
                            "characters": "Content Team Slot 3",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 14,
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
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 35,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "Label",
                                  "width": 35,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "Label",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                    },
                    {
                      "type": "FRAME",
                      "name": "Text Input Group",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 16,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        }
                      },
                      "width": 482.5,
                      "height": 44,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "FRAME",
                          "name": "Input",
                          "layout": {
                            "mode": "HORIZONTAL",
                            "padding": {
                              "top": 8,
                              "right": 16,
                              "bottom": 8,
                              "left": 16
                            },
                            "itemSpacing": 8,
                            "sizing": {
                              "primary": "FIXED",
                              "counter": "FIXED"
                            },
                            "grow": 1
                          },
                          "width": 482.5,
                          "height": 44,
                          "visual": {
                            "fills": [
                              {
                                "type": "SOLID",
                                "color": {
                                  "r": 0.949999988079071,
                                  "g": 0.949999988079071,
                                  "b": 0.949999988079071
                                }
                              }
                            ],
                            "strokeWeight": 1,
                            "strokeAlign": "INSIDE",
                            "cornerRadius": 8
                          },
                          "children": [
                            {
                              "type": "FRAME",
                              "name": "Frame 463",
                              "layout": {
                                "mode": "VERTICAL",
                                "padding": {
                                  "top": 0,
                                  "right": 0,
                                  "bottom": 0,
                                  "left": 0
                                },
                                "itemSpacing": 8,
                                "sizing": {
                                  "primary": "AUTO",
                                  "counter": "AUTO"
                                }
                              },
                              "width": 26,
                              "height": 10,
                              "visual": {
                                "strokeWeight": 1,
                                "strokeAlign": "INSIDE"
                              },
                              "children": [
                                {
                                  "type": "TEXT",
                                  "name": "URL",
                                  "width": 26,
                                  "height": 10,
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
                                    "strokeAlign": "OUTSIDE"
                                  },
                                  "text": {
                                    "characters": "URL",
                                    "fontFamily": "Protipo",
                                    "fontStyle": "Regular",
                                    "fontSize": 14,
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
                  ]
                }
              ]
            },
            {
              "type": "FRAME",
              "name": "Row",
              "layout": {
                "mode": "VERTICAL",
                "padding": {
                  "top": 16,
                  "right": 16,
                  "bottom": 16,
                  "left": 16
                },
                "itemSpacing": 24,
                "sizing": {
                  "primary": "AUTO",
                  "counter": "FIXED"
                },
                "align": "STRETCH"
              },
              "width": 944,
              "height": 302,
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
                "strokes": [
                  {
                    "type": "SOLID",
                    "color": {
                      "r": 0.800000011920929,
                      "g": 0.800000011920929,
                      "b": 0.800000011920929
                    }
                  }
                ],
                "strokeWeight": 1,
                "strokeAlign": "INSIDE",
                "cornerRadius": 12
              },
              "children": [
                {
                  "type": "FRAME",
                  "name": "Title and Action",
                  "layout": {
                    "mode": "HORIZONTAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 12,
                    "sizing": {
                      "primary": "FIXED",
                      "counter": "AUTO"
                    },
                    "align": "STRETCH"
                  },
                  "width": 912,
                  "height": 33,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Title and Description",
                      "layout": {
                        "mode": "VERTICAL",
                        "padding": {
                          "top": 0,
                          "right": 0,
                          "bottom": 0,
                          "left": 0
                        },
                        "itemSpacing": 12,
                        "sizing": {
                          "primary": "AUTO",
                          "counter": "AUTO"
                        }
                      },
                      "width": 237,
                      "height": 33,
                      "visual": {
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "Title",
                          "width": 237,
                          "height": 13,
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
                            "strokeWeight": 1,
                            "strokeAlign": "OUTSIDE"
                          },
                          "text": {
                            "characters": "Advanced: Raw JSON Config",
                            "fontFamily": "Protipo",
                            "fontStyle": "Semibold",
                            "fontSize": 18,
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
                        },
                        {
                          "type": "TEXT",
                          "name": "Description",
                          "width": 224,
                          "height": 8,
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
                            "strokeWeight": 1,
                            "strokeAlign": "OUTSIDE"
                          },
                          "text": {
                            "characters": "Warning: Invalid JSON will fail validation",
                            "fontFamily": "Protipo",
                            "fontStyle": "Regular",
                            "fontSize": 12,
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
                      "type": "INSTANCE",
                      "name": "Chevron - Up",
                      "width": 20,
                      "height": 20,
                      "visual": {
                        "strokeWeight": 0.8333333730697632,
                        "strokeAlign": "INSIDE"
                      },
                      "children": [
                        {
                          "type": "BOOLEAN_OPERATION",
                          "name": "Union",
                          "width": 11.25088119506836,
                          "height": 6.25075626373291,
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
                              "width": 10,
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
                                "strokeWeight": 1.25
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                {
                  "type": "FRAME",
                  "name": "Text Input Group",
                  "layout": {
                    "mode": "HORIZONTAL",
                    "padding": {
                      "top": 0,
                      "right": 0,
                      "bottom": 0,
                      "left": 0
                    },
                    "itemSpacing": 16,
                    "sizing": {
                      "primary": "FIXED",
                      "counter": "AUTO"
                    }
                  },
                  "width": 482.5,
                  "height": 213,
                  "visual": {
                    "strokeWeight": 1,
                    "strokeAlign": "INSIDE"
                  },
                  "children": [
                    {
                      "type": "FRAME",
                      "name": "Input",
                      "layout": {
                        "mode": "HORIZONTAL",
                        "padding": {
                          "top": 8,
                          "right": 16,
                          "bottom": 8,
                          "left": 16
                        },
                        "itemSpacing": 8,
                        "sizing": {
                          "primary": "FIXED",
                          "counter": "AUTO"
                        },
                        "grow": 1
                      },
                      "width": 482.5,
                      "height": 213,
                      "visual": {
                        "fills": [
                          {
                            "type": "SOLID",
                            "color": {
                              "r": 0.949999988079071,
                              "g": 0.949999988079071,
                              "b": 0.949999988079071
                            }
                          }
                        ],
                        "strokeWeight": 1,
                        "strokeAlign": "INSIDE",
                        "cornerRadius": 8
                      },
                      "children": [
                        {
                          "type": "TEXT",
                          "name": "{ \"ui\": { \"contentMvpAssistantId\": \"content_table\", \"defaultMode\": \"simple\", \"hideContentMvpMode\": false, \"simpleModeIds\": [ \"general\", \"content_table\", \"design_critique\", \"design_workshop\" ] },",
                          "width": 284,
                          "height": 197,
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
                            "strokeAlign": "OUTSIDE"
                          },
                          "text": {
                            "characters": "{\n  \"ui\": {\n    \"contentMvpAssistantId\": \"content_table\",\n    \"defaultMode\": \"simple\",\n    \"hideContentMvpMode\": false,\n    \"simpleModeIds\": [\n      \"general\",\n      \"content_table\",\n      \"design_critique\",\n      \"design_workshop\"\n    ]\n  },",
                            "fontFamily": "Protipo",
                            "fontStyle": "Regular",
                            "fontSize": 14,
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
          ]
        }
      ]
    }
  ]
}